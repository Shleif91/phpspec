<?php
declare(strict_types=1);

namespace HelloPhpspec;

interface OffersGrabber
{
    /**
     * @param string $htmlPageContent
     * @return ProductOffer[]
     */
    public function collectPrices(string $htmlPageContent): array;
}