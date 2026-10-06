package com.easyrenting.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.anthropic.models.messages.StructuredOutputConfig;
import com.anthropic.models.messages.StructuredTextBlock;
import com.easyrenting.config.AppProperties;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

/**
 * Claude-backed parser using structured outputs: the response is constrained to the {@link AiExtraction} schema and
 * then sanitised. Any failure (API error, timeout, refusal, unusable output) surfaces as
 * {@link AiParsingException} so the caller can fall back to {@link RuleBasedQueryParser}.
 *
 * <p>Only active when {@code app.ai.anthropic-api-key} is non-blank.
 */
@Component
@ConditionalOnExpression("!'${app.ai.anthropic-api-key:}'.isBlank()")
public class ClaudeQueryParser implements QueryParser, DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(ClaudeQueryParser.class);
    private static final long MAX_TOKENS = 4096L;

    /** Kept free of per-request data (dates, coordinates) so it is byte-stable across requests. */
    static final String SYSTEM_PROMPT = """
            You convert a tenant's free-text search on EasyRenting, an Indian broker-free rental marketplace, into \
            structured search filters. Fill every field of the output schema; use the documented "not mentioned" \
            value (empty string, 0, false or empty list) for anything the query does not express. Never invent \
            constraints the user did not ask for.

            Domain conventions:
            - Rent is monthly, in whole Indian rupees. "k" = thousand, "lakh"/"lac"/"L" = 100000, "cr" = 10000000. \
            "under/below/less than/upto/within/budget X" sets maxRent; "above/over/more than/at least X" sets minRent; \
            "between X and Y" or "X-Y" sets both. A bare amount like "30k" means maxRent. A comparator amount \
            written without a unit and below 1000 (e.g. "under 25") means thousands.
            - Bedrooms: "2bhk", "2 bhk", "2 bed", "two bedroom" = [2]; "1rk"/"1 rk" = [0]; "2 or 3 bhk" = [2, 3]; \
            "3+ bhk" = [3, 4, 5].
            - Property types: flat/apartment = APARTMENT; independent house/builder floor/bungalow = \
            INDEPENDENT_HOUSE; villa = VILLA; PG/paying guest/hostel/co-living = PG; studio = STUDIO (do not also set \
            bhk for "studio").
            - Furnishing: "fully furnished" = FULLY_FURNISHED; "semi furnished" = SEMI_FURNISHED; "unfurnished"/"bare" \
            = UNFURNISHED; plain "furnished" = both FULLY_FURNISHED and SEMI_FURNISHED.
            - Tenant preference: "family"/"families" = FAMILY; girls/ladies/women/female = BACHELOR_FEMALE; \
            boys/gents/men/male, or "bachelors" with no gender = BACHELOR_MALE; company/corporate lease = COMPANY.
            - Amenities: parking/garage = PARKING; lift/elevator = LIFT; power backup/generator/inverter = \
            POWER_BACKUP; gym = GYM; pool/swimming = SWIMMING_POOL; security/gated community/CCTV = SECURITY; \
            wifi/internet = WIFI; AC/air-conditioned = AC; piped gas/gas pipeline = GAS_PIPELINE; clubhouse = \
            CLUB_HOUSE; play area/kids play = PLAY_AREA; pet friendly/pets allowed/dog/cat = PET_FRIENDLY; washing \
            machine = WASHING_MACHINE; fridge/refrigerator = FRIDGE. A furnishing word alone does not imply amenities.
            - Location: put a neighbourhood (Koramangala, HSR Layout, Indiranagar, Whitefield, Powai, Andheri, Bandra, \
            Hinjewadi, Baner, Kharadi, Gachibowli, ...) in locality and its city in city. Use canonical city names: \
            Bangalore -> Bengaluru, Bombay -> Mumbai, Gurgaon -> Gurugram. "near me"/"nearby" sets nearMe = true \
            (only if no locality is named). "within N km" sets radiusKm.
            - Availability: "ready to move"/"immediately" = today's date; "next month" = last day of next month; \
            "by <month>" = last day of that month (next occurrence); "within 2 weeks" = today + 14 days. Resolve all \
            relative dates against the date given in the request.
            - Sort only when the user asks: cheapest/lowest rent = RENT_ASC; most expensive/luxury = RENT_DESC; \
            newest/latest = NEWEST; nearest/closest = DISTANCE.
            - keywords: only distinctive extra words (e.g. "sea view", "balcony", "near metro"); usually empty.
            - explanation: one short, friendly sentence summarising the search, using ₹ with Indian digit grouping, \
            e.g. "2 BHK furnished flats for families with parking under ₹40,000 in Koramangala, Bengaluru".
            If the text is not a rental search at all, return all fields empty and say so briefly in explanation.
            """;

    private final AnthropicClient client;
    private final AiExtractionSanitizer sanitizer;
    private final String model;
    private final Clock clock;
    private final ZoneId zone;

    public ClaudeQueryParser(AppProperties properties, AiExtractionSanitizer sanitizer, Clock clock) {
        AppProperties.Ai ai = properties.ai();
        this.client = AnthropicOkHttpClient.builder()
                .apiKey(ai.anthropicApiKey())
                .timeout(ai.timeout())
                .maxRetries(1)
                .build();
        this.sanitizer = sanitizer;
        this.model = ai.model();
        this.clock = clock;
        this.zone = properties.timezone();
        log.info("Claude query parser enabled (model {})", model);
    }

    @Override
    public ParsedQuery parse(String query, Double lat, Double lng) {
        StructuredMessageCreateParams<AiExtraction> params = MessageCreateParams.builder()
                .model(model)
                .maxTokens(MAX_TOKENS)
                .outputConfig(StructuredOutputConfig.<AiExtraction>builder()
                        .format(AiExtraction.class)
                        .effort(OutputConfig.Effort.LOW)
                        .build())
                .system(SYSTEM_PROMPT)
                .addUserMessage(userMessage(query, lat != null && lng != null))
                .build();
        StructuredMessage<AiExtraction> response;
        try {
            response = client.messages().create(params);
        } catch (RateLimitException ex) {
            throw new AiParsingException("Anthropic rate limit exceeded", ex);
        } catch (AnthropicServiceException ex) {
            throw new AiParsingException("Anthropic API error (status " + ex.statusCode() + ")", ex);
        } catch (AnthropicIoException ex) {
            throw new AiParsingException("Anthropic API unreachable or timed out", ex);
        } catch (AnthropicException ex) {
            throw new AiParsingException("Anthropic SDK error", ex);
        }

        StopReason stopReason = response.stopReason().orElse(null);
        if (StopReason.REFUSAL.equals(stopReason)) {
            throw new AiParsingException("Model declined to parse the query");
        }
        if (StopReason.MAX_TOKENS.equals(stopReason)) {
            throw new AiParsingException("Model output was truncated");
        }
        AiExtraction extraction;
        try {
            extraction = response.content().stream()
                    .flatMap(block -> block.text().stream())
                    .map(StructuredTextBlock::text)
                    .findFirst()
                    .orElseThrow(() -> new AiParsingException("Model returned no structured output"));
        } catch (AnthropicException ex) {
            throw new AiParsingException("Model output did not match the schema", ex);
        }
        return sanitizer.sanitize(extraction, lat, lng);
    }

    private String userMessage(String query, boolean hasLocation) {
        return "Today's date: " + LocalDate.now(clock.withZone(zone)) + "\n"
                + "User location available for \"near me\": " + (hasLocation ? "yes" : "no") + "\n"
                + "Search query: " + query;
    }

    @Override
    public void destroy() {
        client.close();
    }
}
