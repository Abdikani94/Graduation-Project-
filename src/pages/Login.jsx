import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import logo from '../images/logo.jpg';
import api from '../api/axios';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="flex items-center justify-center min-h-screen bg-main-bg w-full p-4 font-sans text-text-dark">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="bg-card-bg border border-border-color rounded-[5px] shadow-xl shadow-primary/10 w-full max-w-[500px] p-12 flex flex-col">
        <div className="text-center mb-10">
          <img src={logo} alt="Jamhuriya University logo" className="mx-auto mb-5 h-20 w-20 rounded-full object-contain" />
          <h1 className="text-primary text-[36px] font-bold tracking-[0.3px] font-jakarta">
            Welcome Back
          </h1>
          <p className="text-brand-green text-[14px] mt-2 font-medium">
            Sign in to the JUST administration portal
          </p>
        </div>

        <form onSubmit={handleSignIn} className="flex flex-col gap-6">
          <div className="flex flex-col">
            <label className="text-text-dark text-[13px] font-semibold mb-2.5 ml-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-white border border-border-color text-text-dark rounded-[5px] px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-[#969696]"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-text-dark text-[13px] font-semibold mb-2.5 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="**********"
              className="w-full bg-white border border-border-color text-text-dark rounded-[5px] px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-[#969696]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-brand-green text-white rounded-[5px] py-4 text-[13px] font-semibold transition-all mt-4 cursor-pointer shadow-lg shadow-primary/20"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
