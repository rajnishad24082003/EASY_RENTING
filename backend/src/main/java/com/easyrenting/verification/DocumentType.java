package com.easyrenting.verification;

import java.util.EnumSet;
import java.util.Set;

public enum DocumentType {
    AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, PROPERTY_PROOF;

    /** At least one of these is required before an owner can submit for verification. */
    public static final Set<DocumentType> IDENTITY = EnumSet.of(AADHAAR, PAN, PASSPORT, DRIVING_LICENSE);
}
