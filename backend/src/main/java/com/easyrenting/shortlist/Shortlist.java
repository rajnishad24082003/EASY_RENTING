package com.easyrenting.shortlist;

import com.easyrenting.common.persistence.BaseEntity;
import com.easyrenting.property.Property;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "shortlists")
public class Shortlist extends BaseEntity {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false, updatable = false)
    private Property property;

    protected Shortlist() {
    }

    public Shortlist(UUID tenantId, Property property) {
        this.tenantId = tenantId;
        this.property = property;
    }

    public Property getProperty() {
        return property;
    }
}
