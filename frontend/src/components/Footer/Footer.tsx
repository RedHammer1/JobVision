import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <p className="footer__text">
          © {new Date().getFullYear()} JobVision — платформа для студентов и молодых специалистов.
        </p>
       
      </div>
    </footer>
  );
};

export default Footer;