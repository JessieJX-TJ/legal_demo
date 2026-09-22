const form = document.querySelector('#login-form');
const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const rememberInput = document.querySelector('#remember');
const errorElement = document.querySelector('#login-error');
const togglePassword = document.querySelector('#toggle-password');

const rememberedUsername = localStorage.getItem('legalAgentRememberedUsername');
if (rememberedUsername) usernameInput.value = rememberedUsername;

function displayNameFromUsername(username) {
  const normalized = username.trim();
  if (normalized === 'Jessie') return 'Jessie';
  if (normalized.toLowerCase() === 'runyu.chen') return 'Runyu Chen';
  if (normalized.includes('@')) return normalized.split('@')[0];
  return normalized;
}

togglePassword.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  togglePassword.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
});

document.querySelector('#forgot-btn')?.addEventListener('click', () => {
  errorElement.textContent = 'Password recovery is not available in this demo. Sign in with any account.';
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    errorElement.textContent = 'Please enter username and password';
    return;
  }

  const user = {
    username,
    displayName: displayNameFromUsername(username),
    role: 'Administrator'
  };
  localStorage.setItem('legalAgentUser', JSON.stringify(user));
  if (rememberInput.checked) localStorage.setItem('legalAgentRememberedUsername', username);
  else localStorage.removeItem('legalAgentRememberedUsername');

  const button = form.querySelector('.login-button');
  button.classList.add('loading');
  button.querySelector('span').textContent = 'Signing in';
  setTimeout(() => {
    location.href = './index.html';
  }, 450);
});
