const form = document.querySelector('#form');
const password = document.querySelector('#password');
const message = document.querySelector('#message');
const submit = document.querySelector('#submit');
const username = document.querySelector('#username');
const title = document.querySelector('#title');
const subtitle = document.querySelector('#subtitle');
const switchText = document.querySelector('#switchText');
const switchButton = document.querySelector('#switchButton');
const showPassword = document.querySelector('#showPassword');
const authCard = document.querySelector('#authCard');
const dashboard = document.querySelector('#dashboard');
const displayName = document.querySelector('#name');
const logout = document.querySelector('#logout');
let mode = 'login';

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  title.textContent = signup ? 'Create account' : 'Sign in';
  subtitle.textContent = signup ? 'Choose details for your new account.' : 'Enter your account details.';
  submit.innerHTML = signup ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
  switchText.textContent = signup ? 'Already a member?' : 'New here?';
  switchButton.textContent = signup ? 'Sign in instead' : 'Create an account';
  password.autocomplete = signup ? 'new-password' : 'current-password';
  message.textContent = '';
}

showPassword.onclick = () => { const visible = password.type === 'text'; password.type = visible ? 'password' : 'text'; showPassword.textContent = visible ? 'Show' : 'Hide'; };
switchButton.onclick = () => setMode(mode === 'login' ? 'signup' : 'login');

form.onsubmit = async event => {
  event.preventDefault(); message.textContent = ''; submit.disabled = true;
  const body = { username: username.value.trim(), password: password.value };
  try {
    const response = await fetch(`/api/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    showDashboard(data.user);
  } catch (error) { message.textContent = error.message; }
  finally { submit.disabled = false; }
};

function showDashboard(user) { authCard.hidden = true; dashboard.hidden = false; displayName.textContent = user.username; }
logout.onclick = async () => { await fetch('/api/logout', { method: 'POST' }); form.reset(); dashboard.hidden = true; authCard.hidden = false; setMode('login'); };
fetch('/api/me').then(response => response.ok ? response.json() : null).then(data => { if (data?.user) showDashboard(data.user); });
