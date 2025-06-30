export const USER_ROLES = {
  USER: "普通用户",
  ADMIN: "管理员",
  SUPER_ADMIN: "超级管理员",
};

export const USER_STATUSES = {
  ACTIVE: "活跃",
  INACTIVE: "未激活",
  SUSPENDED: "已暂停",
  DELETED: "已删除",
};

export const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-red-100 text-red-800";
    case "SUPER_ADMIN":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "INACTIVE":
      return "bg-gray-100 text-gray-800";
    case "SUSPENDED":
      return "bg-yellow-100 text-yellow-800";
    case "DELETED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getRoleText = (role: string) => {
  return USER_ROLES[role as keyof typeof USER_ROLES] || "未知";
};

export const getStatusText = (status: string) => {
  return USER_STATUSES[status as keyof typeof USER_STATUSES] || "未知";
};
