// views/helpers.js
const hbs = require('hbs');

module.exports = function registerHelpers() {
  hbs.registerHelper('includes', function (array, value) {
    if (!array) return false;
    const strArray = array.map(String);
    return strArray.includes(String(value));
  });

  hbs.registerHelper('generateStars', function(rating) {
    let starsHtml = '';
    const totalStars = 5;
    let ratingValue = parseFloat(rating);
    if (isNaN(ratingValue) || ratingValue === null || ratingValue < 0) {
      for (let i = 0; i < totalStars; i++) { starsHtml += '<i class="bi bi-star"></i>'; }
      starsHtml += '<span class="rating-value ms-1 text-muted small">(N/A)</span>';
      return new hbs.SafeString(starsHtml);
    }
    for (let i = 1; i <= totalStars; i++) {
      if (i <= ratingValue) { starsHtml += '<i class="bi bi-star-fill"></i>'; }
      else if (i - ratingValue > 0 && i - ratingValue < 1) { starsHtml += '<i class="bi bi-star"></i>';}
      else { starsHtml += '<i class="bi bi-star"></i>'; }
    }
    starsHtml += `<span class="rating-value ms-1">(${ratingValue.toFixed(1)}/5)</span>`;
    return new hbs.SafeString(starsHtml);
  });

  hbs.registerHelper('currentYear', function() { return new Date().getFullYear(); });
  hbs.registerHelper('eq', function (a, b) { return a === b; });
  hbs.registerHelper('neq', function (a, b) { return a !== b; });
  
  hbs.registerHelper('join', function(arr, separator) {
    if (Array.isArray(arr)) { return arr.join(separator); }
    return '';
  });

  hbs.registerHelper('formatDate', function(dateString) {
    if (!dateString) { return ''; }
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('id-ID', options);
    } catch (e) { console.error('Error formatting date:', e); return dateString; }
  });

  hbs.registerHelper('truncate', function (str, len) {
    if (str && str.length > len && str.length > 0) {
      let new_str = str.substr(0, len);
      new_str = str.substr(0, new_str.lastIndexOf(" "));
      new_str = (new_str.length > 0) ? new_str : str.substr(0, len);
      return new hbs.SafeString(hbs.Utils.escapeExpression(new_str) +'...');
    }
    return str;
  });

  hbs.registerHelper('gte', function (a, b, options) {
    const valA = parseFloat(a); const valB = parseFloat(b); const result = valA >= valB;
    if (options && typeof options.fn === 'function' && typeof options.inverse === 'function') {
      return result ? options.fn(this) : options.inverse(this);
    } else { return result; }
  });

  hbs.registerHelper('subtract', function (a, b) {
    const valA = parseFloat(a); const valB = parseFloat(b);
    if (!isNaN(valA) && !isNaN(valB)) { return valA - valB; }
    return 0;
  });

  hbs.registerHelper('gt', function (a, b) {
    const numA = parseFloat(a); const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) { return numA > numB; }
    return false;
  });

  hbs.registerHelper('toFixed', function (number, digits) {
    if (typeof number === 'number' || (typeof number === 'string' && number.trim() !== '')) {
      return parseFloat(number).toFixed(digits);
    } return 'N/A';
  });

  hbs.registerHelper('multiply', function(a, b) { return parseFloat(a) * parseFloat(b); });
  hbs.registerHelper('add', function(a, b) { return Number(a) + Number(b); });

  hbs.registerHelper('formatRupiah', function (number) {
    if (number === null || number === undefined || isNaN(parseFloat(number))) { return 'Rp 0'; }
    const num = parseFloat(number);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
  });

  hbs.registerHelper('hasUserReviewed', function (reviews, userId) {
      if (!reviews || !Array.isArray(reviews) || userId === undefined || userId === null) { return false; }
      for (let i = 0; i < reviews.length; i++) {
          if (reviews[i] && String(reviews[i].reviewer_id) === String(userId)) { return true; }
      } return false;
  });

  hbs.registerHelper('hasProblematicItems', function (cartItems, options) {
      let problematic = false;
      if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
          for (let i = 0; i < cartItems.length; i++) {
              if (cartItems[i] && (cartItems[i].hasIssue === true || (cartItems[i].errorMessage && cartItems[i].errorMessage.length > 0))) {
                  problematic = true; break;
              }
          }
      }
      if (options && typeof options.fn === 'function' && typeof options.inverse === 'function') {
          return problematic ? options.fn(this) : options.inverse(this);
      } else { return problematic; }
  });

  hbs.registerHelper('nl2br', function(text) {
      if (typeof text === 'string') {
          const escapedText = hbs.Utils.escapeExpression(text);
          return new hbs.SafeString(escapedText.replace(/(\r\n|\n|\r)/gm, '<br>'));
      } return '';
  });
};
