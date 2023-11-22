import { throwError } from './error.js';
import { fetchWithBackEnd, emailRegExp} from './helpers.js';
import { initMainStructure } from './mainStructure.js';
import { setTokenAndUserId } from './main.js';

const showHideButton = document.getElementById('show-hide-button')
const email = document.getElementById('email-input')
const loginButton = document.getElementById('login-button');
const password = document.getElementById('password-input');
const signUpLink = document.getElementById('sign-up-link');

// Event listeners for the email input to validate and provide visual feedback
email.addEventListener('focus', () => {
  email.classList.remove('is-invalid');
});

email.addEventListener('blur', () => {
  // Add invalid styling if email format is incorrect
  if (email.value && !emailRegExp.test(email.value)) {
    email.classList.add('is-invalid');
  }
});

// Event listener to toggle password visibility
password.addEventListener('focus', () => {
  password.classList.remove('is-invalid');
});

// Event listener for the show/hide password button
showHideButton.addEventListener('click', () => {
  const password = document.getElementById('password-input');

  if (password.getAttribute('type') === 'password') {
    showHideButton.textContent = 'Hide';
    password.setAttribute('type', 'text');
  } else {
    showHideButton.textContent = 'Show';
    password.setAttribute('type', 'password');
  }
});

// Event listener for the login button
loginButton.addEventListener('click', () => {
  // Validation for email and password inputs, show error message if invalid
  if (!email.value || !emailRegExp.test(email.value)) {
    throwError('Invalid Email', 'Please enter a valid email address.');
    email.classList.add('is-invalid');
    return;
  } else if (!password.value) {
    throwError('Invalid Password', 'Please enter a password.');
    password.classList.add('is-invalid');
    return;
  }

  // If all inputs are valid, send the request to backend, login the user and initialize the main structure
  fetchWithBackEnd('/auth/login', 'POST', {
    'email': email.value,
    'password': password.value
  }).then((response) => {
    setTokenAndUserId(response.token, response.userId);
    email.value = '';
    password.value = '';
    document.getElementById('login').style.display = 'none';
    initMainStructure();
  }).catch((error) => {
    throwError('Login Error', error)
    email.value = '';
    password.value = '';
  });
});

// Show the register form when user clicks the sign up link
signUpLink.addEventListener('click', () => {
  email.value = '';
  password.value = '';
  email.style.border = '1px solid rgba(29,28,29,.3)';
  password.style.border = '1px solid rgba(29,28,29,.3)';
  document.getElementById('login').style.display = 'none';
  document.getElementById('register').style.display = 'block';
});
