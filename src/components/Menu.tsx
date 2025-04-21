import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Dashboard",
        href: "/",
        visible: ["admin", "faculty"],
      },
      {
        icon: "/student.png", //faculty
        label: "Faculty",
        href: "/list/students",
        visible: ["admin"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin"],
      },
      {
        icon: "/calendar.png",
        label: "Leave",
        href: "/list/leave",
        visible: ["admin"],
      },
      {
        icon: "/student.png", //users
        label: "Users",
        href: "/list/users",
        visible: ["admin"],
      },
    ],
  },
];

const logoutItem = {
  icon: "/logout.png",
  label: "Logout",
  href: "/logout",
  visible: ["admin", "faculty"],
};

const Menu = () => {
  return (
    <div className="mt-4 text-sm flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {menuItems.map((i) => (
          <div className="flex flex-col gap-2" key={i.title}>
            <span className="hidden lg:block text-gray-400 font-light my-4">
              {i.title}
            </span>
            {i.items.map((item) => {
              if (item.visible.includes(role)) {
                return (
                  <Link
                    href={item.href}
                    key={item.label}
                    className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                  >
                    <Image src={item.icon} alt="" width={20} height={20} />
                    <span className="hidden lg:block">{item.label}</span>
                  </Link>
                );
              }
            })}
          </div>
        ))}
      </div>
      <div className="pt-4">
        {logoutItem.visible.includes(role) && (
          <Link
            href={logoutItem.href}
            className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
          >
            <Image src={logoutItem.icon} alt="" width={20} height={20} />
            <span className="hidden lg:block">{logoutItem.label}</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Menu;