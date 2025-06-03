// app/page.tsx

'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const navigateToFaculty = () => {
    router.push('/dashboard/loginf');
  };

  const navigateToAdmin = () => {
    router.push('/dashboard/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Branding Section */}
      <div className="w-full md:w-1/2 bg-[#800000] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/dotsBG.png')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#800000] to-[#600000]"></div>

        <div className="relative h-full flex flex-col items-center justify-center p-8 text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Image
                src="/sjsfilogo.png"
                alt="School Logo"
                width={192}
                height={192}
                className="mx-auto mb-8 drop-shadow-lg"
                priority
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.h1
                className="text-4xl md:text-5xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Saint Joseph School of Fairview Inc.
              </motion.h1>
              <motion.p
                className="text-xl text-white/90"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                Human Resource Management System
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Options */}
      <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Please select your role to continue
            </p>
          </div>

          <div className="space-y-6">
            {/* Faculty Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={navigateToFaculty}
              className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-[#800000]/10 flex items-center justify-center group-hover:bg-[#800000] transition-colors duration-300">
                  <i className="fas fa-chalkboard-teacher text-xl text-[#800000] group-hover:text-white transition-colors duration-300"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    Faculty Portal
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Access your faculty dashboard
                  </p>
                </div>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#800000] transition-colors duration-300">
                <i className="fas fa-chevron-right"></i>
              </div>
            </motion.div>

            {/* Admin Option */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={navigateToAdmin}
              className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-[#800000]/10 flex items-center justify-center group-hover:bg-[#800000] transition-colors duration-300">
                  <i className="fas fa-user-shield text-xl text-[#800000] group-hover:text-white transition-colors duration-300"></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    Administrator Portal
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Access administrative controls
                  </p>
                </div>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-[#800000] transition-colors duration-300">
                <i className="fas fa-chevron-right"></i>
              </div>
            </motion.div>
          </div>

          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>© {currentYear} Saint Joseph School of Fairview Inc.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
