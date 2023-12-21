import { emailRegExp, fetchWithBackEnd } from "./helpers.js";
import { throwError } from "./error.js";
import { initMainStructure } from "./mainStructure.js";
import { setTokenAndUserId } from "./main.js";

const signInLink = document.getElementById('sign-in-link');
const email = document.getElementById('register-email');
const name = document.getElementById('register-username');
const password = document.getElementById('register-password');
const confirmPassword = document.getElementById('register-confirm-password');
const registerButton = document.getElementById('signup-button');

// Clear the wrong input notice when user starts to type
email.addEventListener('focus', () => {
  email.classList.remove('is-invalid');
});

name.addEventListener('focus', () => {
  name.classList.remove('is-invalid');
});

password.addEventListener('focus', () => {
  password.classList.remove('is-invalid');
});

confirmPassword.addEventListener('focus', () => {
  confirmPassword.classList.remove('is-invalid');
});

// Notice user the email is invalid when user leaves the input field
email.addEventListener('blur', () => {
  if (email.value && !emailRegExp.test(email.value)) {
    email.classList.add('is-invalid');
  }
});

// Notice user the password is not same as password when user leaves the input field
confirmPassword.addEventListener('blur', () => {
  if (confirmPassword.value === password.value) {
    confirmPassword.classList.remove('is-invalid');
  } else {
    confirmPassword.classList.add('is-invalid');
  }
});

// Check if the email, username, password and confirm password are valid when user clicks the register button
registerButton.addEventListener('click', () => {
  // If have invalid input, show the error message, and notice in the input field
  if (!email.value || !emailRegExp.test(email.value)) {
    email.classList.add('is-invalid');
    throwError('Invalid Email', 'Please enter a valid email address.');
    return;
  } else if (!name.value) {
    name.classList.add('is-invalid');
    throwError('Invalid Name', 'Please enter a name.');
    return;
  } else if (!password.value) {
    password.classList.add('is-invalid');
    throwError('Invalid Password', 'Please enter a password.');
    return;
  } else if (confirmPassword.value !== password.value) {
    confirmPassword.classList.add('is-invalid');
    throwError('Invalid Password', 'Passwords do not match.');
    return;
  }

  // If all inputs are valid, send the request to backend, register the user and initialize the main structure
  fetchWithBackEnd('/auth/register', 'POST', {
    "email": email.value,
    "password": password.value,
    "name": name.value
  }).then((response) => {
    setTokenAndUserId(response.token, response.userId);
    email.value = '';
    name.value = '';
    password.value = '';
    confirmPassword.value = '';
    document.getElementById('register').style.display = 'none';
    initMainStructure();
  }).catch((error) => {
    throwError('Registration Error', error)
    email.value = '';
    name.value = '';
    password.value = '';
    confirmPassword.value = '';
  });
});

// Switch to sign in page when user clicks the sign in link
signInLink.addEventListener('click', () => {
  email.value = '';
  name.value = '';
  password.value = '';
  confirmPassword.value = '';

  email.classList.remove('is-invalid');
  name.classList.remove('is-invalid');
  password.classList.remove('is-invalid');
  confirmPassword.classList.remove('is-invalid');

  document.getElementById('login').style.display = "block";
  document.getElementById('register').style.display = "none";
});

