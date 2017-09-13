<?php
declare(strict_types=1);

namespace HelloPhpspec;

class ProductOffer
{
    /**
     * @var string
     */
    private $shopName;

    /**
     * @var float
     */
    private $productPrice;

    /**
     * @var float|null
     */
    private $deliveryPrice;

    /**
     * ProductOffer constructor.
     * @param string $shopName
     * @param float $productPrice
     * @param float|null $deliveryPrice
     */
    public function __construct(
        string $shopName,
        float $productPrice,
        ?float $deliveryPrice
    ) {
        $this->shopName = $shopName;
        $this->productPrice = $productPrice;
        $this->deliveryPrice = $deliveryPrice;
    }

    /**
     * @return string
     */
    public function getShopName(): string
    {
        return $this->shopName;
    }

    /**
     * @return float
     */
    public function getProductPrice(): float
    {
        return $this->productPrice;
    }

    /**
     * @return float|null
     */
    public function getDeliveryPrice(): ?float
    {
        return $this->deliveryPrice;
    }
}