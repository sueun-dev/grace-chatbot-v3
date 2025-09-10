import React from "react";

const Button = ({
  children,
  onClick = () => {},
  type = "button",
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`w-fit py-[11px] px-[22px] btn-linear-gradient btn-shadow rounded-[8px] text-white font-medium text-[16px] leading-[120%] cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-300 ease-in-out ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
