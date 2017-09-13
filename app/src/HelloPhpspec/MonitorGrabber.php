<?php

namespace HelloPhpspec;

use Symfony\Component\DomCrawler\Crawler;

class MonitorGrabber implements OffersGrabber
{
    /**
     * @var ProductOffer[]
     */
    private $prices;

    /**
     * MonitorGrabber constructor.
     */
    public function __construct()
    {
        $this->prices = [];
    }

    /**
     * { @inheritdoc }
     */
    public function collectPrices(string $htmlPageContent): array
    {
        $crawler = new Crawler($htmlPageContent);

        $crawler->filter('.b-offers-list-line-table__table > tbody > tr')->each(function (Crawler $node) {
            $price = $this->getFloatNumberFromString($node->filter('.price.price-primary > a > span')->text());

            try {
                $delivery = $node->filter('.b-cell-2 > p')->eq(1)->filter('span')->last()->text();
                $delivery = $this->getDeliveryPrice($delivery);
            } catch (\Exception $exception) {
                $delivery = null;
            }

            $this->prices[] = new ProductOffer(
                $node->filter('.logo > img')->attr('alt'),
                $price,
                $delivery
            );
        });

        return $this->prices;
    }

    /**
     * @param string $str
     * @return float
     */
    private function getFloatNumberFromString(string $str): float
    {
        $patterns = [
            ',' => '.',
            ' ' => '',
            'p.' => ''
        ];

        $prependStr = str_replace(array_keys($patterns), array_values($patterns), $str);

        return (float)$prependStr;
    }

    /**
     * @param string $str
     * @return float
     */
    private function getDeliveryPrice(string $str): float
    {
        if($str == 'бесплатная') {
            $delivery = 0;
        } else {
            $delivery = $this->getFloatNumberFromString($str);
        }

        return (float)$delivery;
    }
}