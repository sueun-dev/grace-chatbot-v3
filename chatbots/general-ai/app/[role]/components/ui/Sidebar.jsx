import React from "react";
import clsx from "clsx";
import Logo from "../Logo";

const Sidebar = ({ showSidebar }) => {
  return (
    <div
      className={clsx(
        `absolute top-0 left-0 bottom-0 overflow-hidden translate-x-[-100%] lg:static lg:w-0 lg:max-w-0 transition-all duration-300 z-index-10 h-full rounded-[16px] border-[1px] border-[#F0F2F5] box-shadow bg-[url('/sidebar-bg.png')] bg-cover bg-center`,
        showSidebar &&
          "translate-x-0 lg:translate-x-0 lg:w-[296px] lg:max-w-[296px]"
      )}
    >
      <div className="absolute top-[17px] left-[17px]">
        <Logo />
      </div>
    </div>
  );
};

export default Sidebar;
