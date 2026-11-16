package routeme.area;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import routeme.exception.InvalidInputException;

class AreaDictionaryTest {

    private final AreaDictionary dictionary = new AreaDictionary();

    @Test
    void in_v5Data_out_dictionaryCoversProvincesAndCities() {
        assertAll(
                () -> assertEquals(34, dictionary.provinces().size(), "34 province-level nodes"),
                () -> assertEquals(375, dictionary.cities().size(), "375 city-level nodes"),
                () -> assertEquals(
                        dictionary.cities().size(),
                        dictionary.cities().keySet().stream().distinct().count(),
                        "city codes are unique"));
    }

    @Test
    void in_guangdongCity_out_standardNameAndProvince() {
        AreaDictionary.AreaCity zhuhai = dictionary.requireCity("440400");

        assertAll(
                () -> assertEquals("珠海市", zhuhai.displayName()),
                () -> assertEquals("广东省", zhuhai.provinceDisplayName()),
                () -> assertEquals("440000", zhuhai.provinceCode()));
    }

    @Test
    void in_municipality_out_provinceNameAsCityName() {
        AreaDictionary.AreaCity beijing = dictionary.requireCity("110100");

        assertAll(
                () -> assertEquals("北京市", beijing.displayName()),
                () -> assertEquals("北京市", beijing.provinceDisplayName()),
                () -> assertEquals("110000", beijing.provinceCode()));
    }

    @Test
    void in_hongKongAndMacau_out_districtAndParishNames() {
        AreaDictionary.AreaCity hongKong = dictionary.requireCity("810001");
        AreaDictionary.AreaCity macau = dictionary.requireCity("820001");

        assertAll(
                () -> assertEquals("中西區", hongKong.displayName()),
                () -> assertEquals("香港", hongKong.provinceDisplayName()),
                () -> assertEquals("花地瑪堂區", macau.displayName()),
                () -> assertEquals("澳门", macau.provinceDisplayName()));
    }

    @Test
    void in_taiwan_out_cityNameAndProvinceDisplay() {
        AreaDictionary.AreaCity taipei = dictionary.requireCity("710100");

        assertAll(
                () -> assertEquals("台北市", taipei.displayName()),
                () -> assertEquals("台湾", taipei.provinceDisplayName()));
    }

    @Test
    void in_unknownCode_out_invalidInput() {
        assertAll(
                () -> assertTrue(dictionary.isValidCityCode("440400")),
                () -> assertFalse(dictionary.isValidCityCode("000000")),
                () -> assertTrue(dictionary.findCity("000000").isEmpty()),
                () -> assertThrows(InvalidInputException.class, () -> dictionary.requireCity("000000")));
    }
}
