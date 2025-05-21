const navbarMenu = document.querySelector(".navbar .links");
const hamburgerBtn = document.querySelector(".hamburger-btn");
const hideMenuBtn = navbarMenu.querySelector(".close-btn");
const showPopupBtn = document.querySelector(".login-btn");
const formPopup = document.querySelector(".form-popup");
const hidePopupBtn = formPopup.querySelector(".close-btn");
const signupLoginLink = formPopup.querySelectorAll(".bottom-link a");
// Show mobile menu
hamburgerBtn.addEventListener("click", () => {
    navbarMenu.classList.toggle("show-menu");
});
// Hide mobile menu
hideMenuBtn.addEventListener("click", () =>  hamburgerBtn.click());
// Show login popup
showPopupBtn.addEventListener("click", () => {
    document.body.classList.toggle("show-popup");
});
// Hide login popup
hidePopupBtn.addEventListener("click", () => showPopupBtn.click());
// Show or hide signup form
signupLoginLink.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        formPopup.classList[link.id === 'signup-link' ? 'add' : 'remove']("show-signup");
    });
});
// Hover effect untuk tombol detail
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.querySelector('.overlay-detail').style.opacity = '1';
  });
  card.addEventListener('mouseleave', () => {
    card.querySelector('.overlay-detail').style.opacity = '0';
  });
});

// Show modal detail produk
const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalPrice = document.getElementById('modalPrice');
const modalCategory = document.getElementById('modalCategory');
const productImagesDiv = document.querySelector('.product-images');
const quantityInput = document.getElementById('quantityInput');
const btnAddToCart = document.getElementById('btnAddToCart');

document.querySelectorAll('.btn-detail').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const card = e.target.closest('.product-card');
    const productId = card.dataset.productId;

    try {
      const res = await fetch(`/api/product/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch product data');
      const product = await res.json();

      modalTitle.textContent = product.name;
      modalDescription.textContent = product.description;
      modalPrice.textContent = product.price;
      modalCategory.textContent = product.category_name;

      // Clear previous images
      productImagesDiv.innerHTML = '';
      product.images.forEach(img => {
        const imageElem = document.createElement('img');
        imageElem.src = img.image_url;
        imageElem.alt = product.name;
        imageElem.className = 'img-fluid rounded mb-2';
        imageElem.style.cursor = 'pointer';
        productImagesDiv.appendChild(imageElem);
      });

      quantityInput.value = 1;

      modal.show();
    } catch (error) {
      alert(error.message);
    }
  });
});

// TODO: Add to cart handler (bisa kita buat setelah ini)
// Toggle wishlist
document.querySelectorAll('.favorite-icon').forEach(button => {
  button.addEventListener('click', async (e) => {
    e.stopPropagation(); // prevent card click events if any
    const productCard = button.closest('.product-card');
    const productId = productCard.dataset.productId;

    try {
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('Failed to toggle wishlist');

      const data = await res.json();

      // Update UI heart icon based on data.inWishlist (boolean)
      if (data.inWishlist) {
        // Filled heart
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#dc3545" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 1.01 4.5 2.09C13.09 4.01 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      } else {
        // Outline heart
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.72-7.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      }
    } catch (err) {
      alert(err.message);
    }
  });
});
