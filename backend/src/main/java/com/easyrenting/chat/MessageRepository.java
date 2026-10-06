package com.easyrenting.chat;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    interface UnreadCount {
        UUID getConversationId();

        long getCount();
    }

    @Query("""
            select m from Message m
            where m.conversation.id in :conversationIds
              and m.createdAt = (select max(m2.createdAt) from Message m2 where m2.conversation = m.conversation)
            """)
    List<Message> findLatestIn(@Param("conversationIds") Collection<UUID> conversationIds);

    @Query("""
            select m.conversation.id as conversationId, count(m) as count from Message m
            where m.conversation.id in :conversationIds and m.senderId <> :userId and m.readAt is null
            group by m.conversation.id
            """)
    List<UnreadCount> countUnreadIn(@Param("conversationIds") Collection<UUID> conversationIds,
                                    @Param("userId") UUID userId);

    @Query("""
            select count(m) from Message m
            where (m.conversation.tenant.id = :userId or m.conversation.owner.id = :userId)
              and m.senderId <> :userId and m.readAt is null
            """)
    long countUnreadForUser(@Param("userId") UUID userId);

    @Query("select m from Message m where m.conversation.id = :conversationId order by m.createdAt desc, m.id desc")
    List<Message> findNewest(@Param("conversationId") UUID conversationId, Pageable pageable);

    @Query("""
            select m from Message m where m.conversation.id = :conversationId and m.createdAt < :before
            order by m.createdAt desc, m.id desc
            """)
    List<Message> findOlderThan(@Param("conversationId") UUID conversationId, @Param("before") Instant before,
                                Pageable pageable);

    @Modifying
    @Query("""
            update Message m set m.readAt = :readAt
            where m.conversation.id = :conversationId and m.senderId <> :readerId and m.readAt is null
            """)
    int markReadBy(@Param("conversationId") UUID conversationId, @Param("readerId") UUID readerId,
                   @Param("readAt") Instant readAt);

    long countByCreatedAtAfter(Instant since);
}
