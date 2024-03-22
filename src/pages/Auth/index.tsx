import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();

  const handleSubmit = () => {
    navigate('/app');
  };
  return (
    <div>
      <h1 className="text-3xl font-bold underline">Bento POS</h1>
      <form onSubmit={handleSubmit}>
        <div className="center">
          <button type="submit">Authenticate</button>
        </div>
      </form>
    </div>
  );
};

export default memo(Auth);
