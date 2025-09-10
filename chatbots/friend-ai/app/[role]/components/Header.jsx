import { PanelLeft, PanelLeftClose } from "lucide-react";
import React from "react";

const Header = ({ handleShowSidebar, showSidebar }) => {
  return (
    <div className="p-[16px] border-b-[1px] border-[#E3E6EA] relative">
      <button
        className="absolute right-[16px] top-[16px] z-5"
        onClick={handleShowSidebar}
      >
        {showSidebar ? <PanelLeftClose size={24} /> : <PanelLeft size={24} />}
      </button>
      <h1 className="font-medium text-[16px] text-[#19213D] text-center ">
        Chats
      </h1>
    </div>
  );
};

export default Header;
