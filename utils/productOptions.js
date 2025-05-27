// utils/productOptions.js
const PREDEFINED_COLORS_CONFIG = [
    { name: 'Black', hex: '#000000', border: false }, { name: 'White', hex: '#FFFFFF', border: true },
    { name: 'Red', hex: '#FF0000', border: false }, { name: 'Blue', hex: '#0000FF', border: false },
    { name: 'Green', hex: '#008000', border: false }, { name: 'Yellow', hex: '#FFFF00', border: true },
    { name: 'Purple', hex: '#800080', border: false }, { name: 'Orange', hex: '#FFA500', border: false },
    { name: 'Pink', hex: '#FFC0CB', border: true }, { name: 'Brown', hex: '#A52A2A', border: false },
    { name: 'Gray', hex: '#808080', border: false }, { name: 'Silver', hex: '#C0C0C0', border: true },
    { name: 'Gold', hex: '#FFD700', border: false }, { name: 'Navy', hex: '#000080', border: false },
    { name: 'Olive', hex: '#808000', border: false }, { name: 'Maroon', hex: '#800000', border: false },
    { name: 'Beige', hex: '#F5F5DC', border: true }, { name: 'Teal', hex: '#008080', border: false },
    { name: 'Sky Blue', hex: '#87CEEB', border: true }, { name: 'Lime', hex: '#00FF00', border: true }
];

const PREDEFINED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const SORT_OPTIONS = [
    { value: 'latest', text: 'Sort by: Latest', orderBy: 'p.created_at DESC' },
    { value: 'price_asc', text: 'Price: Low to High', orderBy: 'p.price ASC' },
    { value: 'price_desc', text: 'Price: High to Low', orderBy: 'p.price DESC' },
    { value: 'rating', text: 'Rating: High to Low', orderBy: 'p.rating DESC' }
];

const PREDEFINED_COLORS_MAP = new Map(PREDEFINED_COLORS_CONFIG.map(color => [color.name.toLowerCase(), color]));

function getColorDetails(colorName) {
    const lowerColorName = colorName.toLowerCase().trim();
    if (PREDEFINED_COLORS_MAP.has(lowerColorName)) {
        const detail = PREDEFINED_COLORS_MAP.get(lowerColorName);
        return { name: detail.name, hex: detail.hex, border: detail.border };
    }
    // Fallback
    const lightColorsForFallback = ['yellow', 'white', 'pink', 'beige', 'lime', 'sky blue', 'aqua', 'aliceblue', 'ghostwhite', 'ivory', 'lightyellow', 'lightcyan', 'lavender'];
    const needsBorder = lightColorsForFallback.includes(lowerColorName);
    return { name: colorName.trim(), hex: lowerColorName, border: needsBorder };
}

module.exports = {
    PREDEFINED_COLORS_CONFIG,
    PREDEFINED_SIZES,
    SORT_OPTIONS,
    getColorDetails // Ekspor juga fungsi getColorDetails
};