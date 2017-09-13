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


    function it_parse_file_and_return_array()
    {
        $html = file_get_contents('/var/www/page/LG_25UM58-P.html');

        /** @var ProductOffer[] $prices */
        $prices = $this->collectPrices($html);

        $prices[0]->shouldHaveType(ProductOffer::class);
        $prices[0]->getShopName()->shouldBe('TTN.by');
        $prices[0]->getProductPrice()->shouldBe(1355.43);
        $prices[0]->getDeliveryPrice()->shouldBe(null);

        $prices[1]->shouldHaveType(ProductOffer::class);
        $prices[1]->getShopName()->shouldBe('NOVATEK');
        $prices[1]->getProductPrice()->shouldBe(349.05);
        $prices[1]->getDeliveryPrice()->shouldBe((float)0);
    }
}
