import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import logo from '../images/logo.jpg';
import api from '../api/axios';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [password, setPassword] = useState(null);
  const [toast, setToast] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setToast(null);

    try {
      const result = await api.post('/auth/login', { username, password });
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('authUser', JSON.stringify(result.user));
      navigate('/dashboard');
    } catch (loginError) {
      setToast({
        type: 'error',
        title: 'Login failed',
        message: loginError.message,
      });
    }
  };

  return (
    <div className="public-page login-public-page font-sans text-text-dark">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <main className="login-public-main">
      <section className="login-card">
        <div className="login-card-heading">
          <img src={logo} alt="Jamhuriya University logo" />
          <span>JUST ADMIN PORTAL</span>
          <h1>Welcome Back</h1>
          <p>Sign in securely to manage the university admission system.</p>
        </div>

        <form onSubmit={handleSignIn} className="login-form">
          <label className="login-field">
            <span>Username</span>
            <input
              type="text"
              value={username ?? ''}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="off"
              required
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              value={password ?? ''}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="**********"
              autoComplete="new-password"
              required
            />
          </label>

          <button type="submit">Sign In</button>
        </form>
      </section>
      </main>
    </div>
  );
};

export default Login;
