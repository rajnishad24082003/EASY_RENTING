package com.easyrenting.property;

import com.easyrenting.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "property_images")
public class PropertyImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false, updatable = false)
    private Property property;

    @Column(nullable = false, length = 1024)
    private String url;

    @Column(name = "storage_key", length = 512)
    private String storageKey;

    @Column(nullable = false)
    private boolean cover;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected PropertyImage() {
    }

    PropertyImage(Property property, String url, String storageKey, boolean cover, int sortOrder) {
        this.property = property;
        this.url = url;
        this.storageKey = storageKey;
        this.cover = cover;
        this.sortOrder = sortOrder;
    }

    void markCover(boolean cover) {
        this.cover = cover;
    }

    public String getUrl() {
        return url;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public boolean isCover() {
        return cover;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
