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
    // Tambahkan warna lain yang umum atau relevan dengan produk Anda
];

const PREDEFINED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

const SORT_OPTIONS = [
    { value: 'latest', text: 'Sort by: Latest', orderBy: 'p.created_at DESC' },
    { value: 'price_asc', text: 'Price: Low to High', orderBy: 'p.price ASC' },
    { value: 'price_desc', text: 'Price: High to Low', orderBy: 'p.price DESC' },
    { value: 'rating', text: 'Rating: High to Low', orderBy: 'p.rating DESC NULLS LAST' } // NULLS LAST jika DB Anda mendukung (mis. PostgreSQL)
                                                                                          // Untuk MySQL, produk dengan rating NULL akan di awal atau akhir tergantung ASC/DESC.
                                                                                          // Jika ingin rating NULL di akhir untuk DESC, bisa: ORDER BY p.rating IS NULL, p.rating DESC
];

// Map untuk pencarian detail warna yang lebih cepat (case-insensitive untuk key)
const PREDEFINED_COLORS_MAP = new Map(PREDEFINED_COLORS_CONFIG.map(color => [color.name.toLowerCase(), color]));

/**
 * Mendapatkan detail visual (hex, border) untuk sebuah nama warna.
 * Menggunakan PREDEFINED_COLORS_MAP sebagai sumber utama, dengan fallback.
 * @param {string} colorName Nama warna input.
 * @returns {object} Objek berisi { name, hex, border }. 'name' adalah nama standar dari config jika ada, jika tidak nama inputan yang sudah di-trim.
 */
function getColorDetails(colorName) {
    if (!colorName || typeof colorName !== 'string') {
        // Mengembalikan objek default jika nama warna tidak valid atau kosong
        return { name: 'Unknown', hex: '#d3d3d3', border: true }; // Contoh: abu-abu muda
    }
    const trimmedLowerColorName = colorName.toLowerCase().trim();

    if (PREDEFINED_COLORS_MAP.has(trimmedLowerColorName)) {
        const detail = PREDEFINED_COLORS_MAP.get(trimmedLowerColorName);
        // Mengembalikan nama asli dari config untuk konsistensi tampilan
        return { name: detail.name, hex: detail.hex, border: detail.border };
    }

    // Fallback jika warna tidak ada di PREDEFINED_COLORS_MAP
    // Coba gunakan nama warna input sebagai nilai CSS color, dan tentukan border secara heuristik.
    const lightColorsForFallback = [
        'yellow', 'white', 'pink', 'beige', 'lime', 'sky blue', 'aqua', 'aliceblue', 
        'ghostwhite', 'ivory', 'lightyellow', 'lightcyan', 'lavender', 'snow', 'seashell'
    ];
    const needsBorder = lightColorsForFallback.includes(trimmedLowerColorName);
    
    // Format nama agar huruf pertama kapital untuk konsistensi tampilan fallback
    const originalTrimmedName = colorName.trim();
    const fallbackName = originalTrimmedName.charAt(0).toUpperCase() + originalTrimmedName.slice(1).toLowerCase();

    return { name: fallbackName, hex: trimmedLowerColorName, border: needsBorder };
}

module.exports = {
    PREDEFINED_COLORS_CONFIG,
    PREDEFINED_SIZES,
    SORT_OPTIONS,
    getColorDetails // Pastikan fungsi ini diekspor
};