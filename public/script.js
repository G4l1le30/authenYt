/*
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
*/
const socket = io(); // Membuat koneksi ke server Socket.IO

socket.on('connect', () => {
    console.log('[Socket.IO Client] Terhubung ke server dengan ID:', socket.id);
    // Kirim event tes saat terhubung
    socket.emit('testEvent', { from: 'client', data: 'Halo, ini tes dari klien!' });
});

socket.on('eventFromServer', (data) => {
    console.log('[Socket.IO Client] eventFromServer diterima:', data);
});

socket.on('disconnect', () => {
    console.log('[Socket.IO Client] Terputus dari server.');
});
if (typeof socket !== 'undefined') {
    socket.on('chatNotification', (data) => {
        // Cek apakah pengguna ada di halaman produk yang sama dengan chat atau di dashboard chat
        // Ini contoh sederhana, Anda mungkin perlu logika lebih canggih
        let currentChattingWith = null;
        const chatModalEl = document.getElementById('chatWithSellerModal');
        const chatReceiverIdInput = document.getElementById('chatCurrentReceiverId');

        if (chatModalEl && chatModalEl.classList.contains('show') && chatReceiverIdInput) {
            currentChattingWith = parseInt(chatReceiverIdInput.value);
        }

        // Hanya tampilkan notifikasi jika bukan untuk chat yang sedang aktif dibuka
        if (data.fromUserId !== currentChattingWith) {
            // Anda perlu fungsi global showToast atau cara lain untuk menampilkan notifikasi
            // Misal, jika Anda punya fungsi showGlobalToast:
            // showGlobalToast(`Pesan baru dari <span class="math-inline">\{data\.fromUserName\}\: "</span>{data.messagePreview}"`, 'info', () => {
            //    window.location.href = `/product/<span class="math-inline">\{data\.productId\}?action\=chat&sellerId\=</span>{data.fromUserId}` // Atau ke halaman chat khusus
            // });
            console.log(`[Global Notif] Pesan baru dari ${data.fromUserName}: ${data.messagePreview}`);
            // Untuk sementara, kita bisa gunakan alert jika tidak ada sistem toast global
            // Ini akan mengganggu jika pengguna di halaman lain.
            // Idealnya, ini adalah notifikasi "toast" kecil yang tidak mengganggu.
            if (typeof showDashboardToast === 'function') { // Jika fungsi toast dashboard tersedia
                showDashboardToast(`Pesan baru dari ${data.fromUserName}`, 'info');
            } else if (typeof showToastOnPage === 'function') { // Jika fungsi toast singleProduct tersedia
                 showToastOnPage(`Pesan baru dari ${data.fromUserName}`, 'info');
            } else {
                // Fallback sangat dasar
                // alert(`Pesan baru dari ${data.fromUserName}`);
                console.warn("Tidak ada fungsi toast global untuk menampilkan notifikasi chat.");
            }
        }
    });
}
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
/*
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
*/
// TODO: Add to cart handler (bisa kita buat setelah ini)
btnAddToCart.addEventListener('click', async () => {
  const productId = btnAddToCart.getAttribute('data-product-id') || modal.getRelatedTarget()?.closest('.product-card')?.dataset.productId;
  const quantity = parseInt(quantityInput.value);

  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId, quantity }),
    });

    if (!res.ok) throw new Error('Failed to add to cart');

    alert('Product added to cart!');
    modal.hide(); // optional: close modal
  } catch (error) {
    alert(error.message);
  }
});

