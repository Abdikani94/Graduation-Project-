import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setToast(null);

    try {
      const response = await fetch('http://127.0.0.1:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Invalid username or password');
      }

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
    <div className="flex items-center justify-center min-h-screen bg-main-bg w-full p-4 font-sans">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="bg-card-bg border border-border-color rounded-[24px] w-full max-w-[500px] p-12 flex flex-col">
        <div className="text-center mb-10">
          <h1 className="text-white text-[42px] font-extrabold tracking-tight font-jakarta">
            Welcome <span className="font-serif italic font-normal text-primary">back</span>
          </h1>
          <p className="text-gray-500 text-[14px] mt-2">
            Sign in to track your application
          </p>
        </div>

        <form onSubmit={handleSignIn} className="flex flex-col gap-6">
          <div className="flex flex-col">
            <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-[#070211]/60 border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-600"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="**********"
              className="w-full bg-[#070211]/60 border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-600"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-opacity-90 text-white rounded-full py-4 text-[13px] font-semibold transition-all mt-4 cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
