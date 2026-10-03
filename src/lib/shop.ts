// Shop details printed on memos. Set them in .env (all optional).
export function shopInfo() {
  return {
    name: process.env.SHOP_NAME || "My Shop",
    phone: process.env.SHOP_PHONE || "",
    address: process.env.SHOP_ADDRESS || "",
  };
}
