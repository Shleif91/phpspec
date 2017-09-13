<?php

namespace spec\HelloPhpspec;

use HelloPhpspec\MonitorGrabber;
use HelloPhpspec\ProductOffer;
use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class MonitorGrabberSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType(MonitorGrabber::class);
    }

    function it_parse_empty_file_and_return_empty_array()
    {
        $this->collectPrices('')->shouldReturn([]);
    }

    function it_fetches_all_offers_from_page()
    {
        $html = file_get_contents('/var/www/page/LG_25UM58-P.html');

        $this->collectPrices($html)->shouldHaveCount(15);

    }

    function it_correctly_handles_price_larger_than_1000_rubles()
    {
        $html = file_get_contents('/var/www/page/LG_25UM58-P-more-1000.html');

        /** @var ProductOffer[] $prices */
        $prices = $this->collectPrices($html);

        $price = new ProductOffer(
            'TTN.by',
            1357.27,
            4.5
        );

        $prices->shouldBeLike([$price]);
    }

    function it_detects_free_delivery()
    {
        $html = file_get_contents('/var/www/page/LG_25UM58-P-free-delivery.html');

        /** @var ProductOffer[] $prices */
        $prices = $this->collectPrices($html);

        $price = new ProductOffer(
            'TTN.by',
            1357.27,
            0
        );

        $prices->shouldBeLike([$price]);
    }

    function it_detects_unavailable_delivery()
    {
        $html = file_get_contents('/var/www/page/LG_25UM58-P-free-delivery.html');

        /** @var ProductOffer[] $prices */
        $prices = $this->collectPrices($html);

        $price = new ProductOffer(
            'TTN.by',
            1357.27,
            null
        );

        $prices->shouldBeLike([$price]);
    }
}
