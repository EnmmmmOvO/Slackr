const myToast = new bootstrap.Toast(document.getElementById('liveToast'));
const toastTitle = document.getElementById('toast-title');
const toastBody = document.getElementById('toast-body');

// Show toast notice in the left bottom corner
export const throwToast = (title, message) => {
  toastTitle.innerHTML = title;
  toastBody.innerHTML = message;
  myToast.show();
}