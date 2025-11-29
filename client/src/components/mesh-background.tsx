import { motion } from "framer-motion";

export function MeshBackground() {
  return (
    <div className="mesh-bg" data-testid="mesh-background">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, transparent 70%)",
            top: "10%",
            left: "10%",
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 70%)",
            top: "5%",
            right: "15%",
            filter: "blur(50px)",
          }}
          animate={{
            x: [0, -40, 30, 0],
            y: [0, 30, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[550px] h-[550px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, transparent 70%)",
            bottom: "10%",
            right: "20%",
            filter: "blur(55px)",
          }}
          animate={{
            x: [0, 30, -50, 0],
            y: [0, -30, 40, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[450px] h-[450px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
            bottom: "20%",
            left: "5%",
            filter: "blur(45px)",
          }}
          animate={{
            x: [0, -30, 40, 0],
            y: [0, 40, -30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}
