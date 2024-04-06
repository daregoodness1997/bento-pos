import React, { memo, useState } from 'react';
import { Button, Input } from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';

import { EyeFilledIcon, EyeSlashFilledIcon } from 'components';

import './styles.scss';

const Auth = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const navigate = useNavigate();

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = () => {
    navigate('/app');
  };
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="w-1/4">
        <h1 className="text-2xl font-bold text-white">Bento POS</h1>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-container">
            <Input type="email" label="Email" placeholder="Enter your email" />
            <Input
              label="Password"
              placeholder="Enter your password"
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                >
                  {isVisible ? (
                    <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
              type={isVisible ? 'text' : 'password'}
            />
          </div>

          <Button type="submit" color="primary">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};

export default memo(Auth);
