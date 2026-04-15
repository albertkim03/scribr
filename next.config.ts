import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache client-side navigation for dynamic pages for 30 seconds.
    // Switching back to a recently-visited tab skips the server round-trip entirely.
    staleTimes: {
      dynamic: 1800, // 30 min — mutations call markDirty + router.refresh() so timer is rarely the trigger
    },
  },
};

export default nextConfig;
