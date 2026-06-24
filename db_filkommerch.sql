-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jun 24, 2026 at 09:12 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_filkommerch`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `created_at`) VALUES
(1, 'Apparel', 'apparel', '2026-06-22 12:19:44'),
(2, 'Accessories', 'accessories', '2026-06-22 12:19:44');

-- --------------------------------------------------------

--
-- Table structure for table `offline_sales`
--

CREATE TABLE `offline_sales` (
  `id` int NOT NULL,
  `sale_id` varchar(50) NOT NULL,
  `admin_id` int DEFAULT NULL,
  `cashier_name` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `payment_method` varchar(50) NOT NULL,
  `subtotal` int NOT NULL,
  `discount` int DEFAULT '0',
  `tax` int DEFAULT '0',
  `total` int NOT NULL,
  `notes` text,
  `source` enum('offline') DEFAULT 'offline',
  `status` varchar(50) DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `offline_sales`
--

INSERT INTO `offline_sales` (`id`, `sale_id`, `admin_id`, `cashier_name`, `customer_name`, `payment_method`, `subtotal`, `discount`, `tax`, `total`, `notes`, `source`, `status`, `created_at`) VALUES
(1, 'POS-1782284918089', 1, 'adminfm', 'Achmal', 'Tunai', 345000, 0, 0, 345000, NULL, 'offline', 'completed', '2026-06-24 07:08:38'),
(2, 'POS-1782285416798', 1, 'adminfm', NULL, 'Debit', 345000, 0, 0, 345000, NULL, 'offline', 'completed', '2026-06-24 07:16:56'),
(3, 'POS-1782285665277', 1, 'adminfm', NULL, 'Debit', 185000, 0, 0, 185000, NULL, 'offline', 'completed', '2026-06-24 07:21:05');

-- --------------------------------------------------------

--
-- Table structure for table `offline_sale_items`
--

CREATE TABLE `offline_sale_items` (
  `id` int NOT NULL,
  `sale_id` varchar(50) NOT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `variant_id` int DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` int NOT NULL,
  `discount` int DEFAULT '0',
  `subtotal` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `offline_sale_items`
--

INSERT INTO `offline_sale_items` (`id`, `sale_id`, `product_id`, `product_name`, `variant_id`, `size`, `quantity`, `unit_price`, `discount`, `subtotal`, `created_at`) VALUES
(1, 'POS-1782284918089', 2, 'Hoodie Code/Run (S)', 5, 'S', 1, 160000, 0, 160000, '2026-06-24 07:08:38'),
(2, 'POS-1782284918089', 1, 'Varsity FILKOM Edition (S)', 1, 'S', 1, 185000, 0, 185000, '2026-06-24 07:08:38'),
(3, 'POS-1782285416798', 2, 'Hoodie Code/Run (S)', 5, 'S', 1, 160000, 0, 160000, '2026-06-24 07:16:56'),
(4, 'POS-1782285416798', 1, 'Varsity FILKOM Edition (S)', 1, 'S', 1, 185000, 0, 185000, '2026-06-24 07:16:56'),
(5, 'POS-1782285665277', 1, 'Varsity FILKOM Edition (S)', 1, 'S', 1, 185000, 0, 185000, '2026-06-24 07:21:05');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `user_id` int DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_nim` varchar(25) DEFAULT NULL,
  `customer_email` varchar(100) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `shipping_address` text,
  `gross_amount` int NOT NULL,
  `payment_type` varchar(50) DEFAULT NULL,
  `transaction_status` varchar(20) DEFAULT 'pending',
  `midtrans_transaction_id` varchar(100) DEFAULT NULL,
  `snap_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_id`, `user_id`, `customer_name`, `customer_nim`, `customer_email`, `customer_phone`, `shipping_address`, `gross_amount`, `payment_type`, `transaction_status`, `midtrans_transaction_id`, `snap_token`, `created_at`, `updated_at`) VALUES
(1, 'FILKOM-1718900001', 2, 'Ozza Mahasiswa', '23515040000000', 'ozza@student.ub.ac.id', '089876543210', 'Jl. MT Haryono No. 165, Malang', 345000, 'qris', 'settlement', 'xyz123-qris-midtrans', NULL, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(2, 'FILKOM-1718900002', NULL, 'Budi Tamu', '24515020000000', 'budi.maba@gmail.com', '08111222333', 'Ambil di Gedung G FILKOM', 85000, 'gopay', 'pending', NULL, NULL, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(3, 'FILKOM-1718900003', 2, 'Ozza Mahasiswa', '23515040000000', 'ozza@student.ub.ac.id', '089876543210', 'Jl. MT Haryono No. 165, Malang', 160000, 'bank_transfer', 'expire', 'abc987-bca-midtrans', NULL, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(4, 'FILKOM-1782155188373', NULL, 'Rizwanda Keysha Cahya Putra', '235150601111041', 'buyer@example.com', '085156563724', 'Jl. Gadang Gg. VIII', 25000, NULL, 'pending', NULL, NULL, '2026-06-22 19:06:28', '2026-06-22 19:06:28'),
(5, 'FILKOM-1782284673945', NULL, 'Rizwanda Keysha Cahya Putra', '235150601111041', 'rizwandakeysha@student.ub.ac.id', '085156563724', 'Jl. Gadang Gg. VIII', 245000, NULL, 'pending', NULL, NULL, '2026-06-24 07:04:35', '2026-06-24 07:04:35'),
(6, 'FILKOM-1782284717376', NULL, 'Rizwanda Keysha', '235150601111041', 'rizwandakeysha@gmail.com', '085156563724', NULL, 245000, NULL, 'pending', NULL, NULL, '2026-06-24 07:05:17', '2026-06-24 07:05:17'),
(7, 'FILKOM-1782284823370', NULL, 'Rizwanda Keysha', '235150601111041', 'rizwandakeysha@gmail.com', '085156563724', NULL, 245000, 'qris', 'pending', NULL, 'a967f869-b834-42da-81df-e894f92c0fcb', '2026-06-24 07:07:05', '2026-06-24 07:07:06'),
(8, 'POS-1782285405824', NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 345000, 'qris', 'pending', NULL, 'afe978ad-9f66-4292-9c72-5388fa59d076', '2026-06-24 07:16:45', '2026-06-24 07:16:46'),
(9, 'POS-1782285672854', NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 110000, 'qris', 'pending', NULL, '943f5d44-98af-4fad-953b-822526511627', '2026-06-24 07:21:13', '2026-06-24 07:21:14'),
(10, 'POS-1782286799155', NULL, 'Rizwanda', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 185000, 'qris', 'pending', NULL, '23da02ac-7b81-441c-9838-33497bbfe2e3', '2026-06-24 07:39:59', '2026-06-24 07:39:59'),
(11, 'POS-1782286868519', NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 185000, 'qris', 'pending', NULL, '4c5fc7e1-3c36-4c1d-afa2-9095e9675750', '2026-06-24 07:41:08', '2026-06-24 07:41:08'),
(12, 'POS-1782291367846', NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 160000, 'qris', 'pending', NULL, '1618b2d9-a0bb-4ffd-9153-762a0c327bcb', '2026-06-24 08:56:07', '2026-06-24 08:56:07');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(150) NOT NULL,
  `size` varchar(10) NOT NULL,
  `color` varchar(50) DEFAULT NULL,
  `quantity` int NOT NULL,
  `price` int NOT NULL,
  `subtotal` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `size`, `quantity`, `price`, `subtotal`) VALUES
(1, 'FILKOM-1718900001', 1, 'Varsity FILKOM Edition', 'L', 1, 185000, 185000),
(2, 'FILKOM-1718900001', 2, 'Hoodie Code/Run', 'M', 1, 160000, 160000),
(3, 'FILKOM-1718900002', 3, 'T-Shirt Debugging', 'XL', 1, 85000, 85000),
(4, 'FILKOM-1718900003', 2, 'Hoodie Code/Run', 'L', 1, 160000, 160000),
(5, 'FILKOM-1782155188373', NULL, 'Lanyard FILKOM Exclusive', 'One Size', 1, 25000, 25000),
(6, 'FILKOM-1782284823370', 3, 'T-Shirt Debugging', 'One Size', 1, 85000, 85000),
(7, 'FILKOM-1782284823370', 2, 'Hoodie Code/Run', 'One Size', 1, 160000, 160000),
(8, 'POS-1782285405824', 2, 'Hoodie Code/Run (S)', 'One Size', 1, 160000, 160000),
(9, 'POS-1782285405824', 1, 'Varsity FILKOM Edition (S)', 'One Size', 1, 185000, 185000),
(10, 'POS-1782285672854', 3, 'T-Shirt Debugging (S)', 'One Size', 1, 85000, 85000),
(11, 'POS-1782285672854', 4, 'Lanyard FILKOM Exclusive (All Size)', 'One Size', 1, 25000, 25000),
(12, 'POS-1782286799155', 1, 'Varsity FILKOM Edition (S)', 'One Size', 1, 185000, 185000),
(13, 'POS-1782286868519', 1, 'Varsity FILKOM Edition (S)', 'One Size', 1, 185000, 185000),
(14, 'POS-1782291367846', 2, 'Hoodie Code/Run (S)', 'One Size', 1, 160000, 160000);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text,
  `price` int NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `description`, `price`, `image_url`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Varsity FILKOM Edition', 'varsity-filkom', 'Varsity premium dengan bordir logo FILKOM.', 185000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 1, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(2, 1, 'Hoodie Code/Run', 'hoodie-code-run', 'Hoodie nyaman untuk ngoding semalaman.', 160000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 1, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(3, 1, 'T-Shirt Debugging', 'tshirt-debugging', 'Kaos katun adem dengan desain programmer.', 85000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400', 1, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(4, 2, 'Lanyard FILKOM Exclusive', 'lanyard-filkom', 'Lanyard untuk ID Card mahasiswa.', 25000, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=400', 1, '2026-06-22 12:19:44', '2026-06-22 12:19:44');

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `size` varchar(10) NOT NULL,
  `color` varchar(50) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_id`, `size`, `stock`) VALUES
(1, 1, 'S', 7),
(2, 1, 'M', 25),
(3, 1, 'L', 30),
(4, 1, 'XL', 15),
(5, 2, 'S', 3),
(6, 2, 'M', 20),
(7, 2, 'L', 20),
(8, 2, 'XL', 10),
(9, 3, 'S', 15),
(10, 3, 'M', 40),
(11, 3, 'L', 50),
(12, 3, 'XL', 20),
(13, 4, 'All Size', 100);

-- --------------------------------------------------------

--
-- Table structure for table `store_settings`
--

CREATE TABLE `store_settings` (
  `id` int NOT NULL,
  `store_name` varchar(255) DEFAULT 'FILKOM Merch',
  `address` text,
  `phone` varchar(20) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT '0.00',
  `qris_static_url` varchar(255) DEFAULT NULL,
  `homepage_layout` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `store_settings`
--

INSERT INTO `store_settings` (`id`, `store_name`, `address`, `phone`, `tax_rate`, `qris_static_url`, `updated_at`) VALUES
(1, 'FILKOM Merch', 'Gedung BEM FILKOM UB', '081234567890', '0.00', NULL, '2026-06-24 07:02:47');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `nim` varchar(25) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `role` enum('admin','customer') DEFAULT 'customer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `nim`, `email`, `password_hash`, `phone`, `address`, `role`, `created_at`, `updated_at`) VALUES
(1, 'Admin BEM FILKOM', '20515020000000', 'admin@filkom.ub.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567890', 'Gedung BEM FILKOM UB', 'admin', '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(2, 'Ozza Mahasiswa', '23515040000000', 'ozza@student.ub.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '089876543210', 'Jl. MT Haryono No. 165, Malang', 'customer', '2026-06-22 12:19:44', '2026-06-22 12:19:44');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `offline_sales`
--
ALTER TABLE `offline_sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sale_id` (`sale_id`);

--
-- Indexes for table `offline_sale_items`
--
ALTER TABLE `offline_sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_id` (`sale_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `store_settings`
--
ALTER TABLE `store_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `nim` (`nim`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `offline_sales`
--
ALTER TABLE `offline_sales`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `offline_sale_items`
--
ALTER TABLE `offline_sale_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `store_settings`
--
ALTER TABLE `store_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `offline_sale_items`
--
ALTER TABLE `offline_sale_items`
  ADD CONSTRAINT `offline_sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `offline_sales` (`sale_id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
