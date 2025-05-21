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
