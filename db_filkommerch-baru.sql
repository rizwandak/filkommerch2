-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jun 24, 2026 at 01:15 PM
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
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cashier_shifts`
--

CREATE TABLE `cashier_shifts` (
  `id` bigint UNSIGNED NOT NULL,
  `cashier_id` int NOT NULL,
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  `opening_cash` int UNSIGNED NOT NULL DEFAULT '0',
  `closing_cash` int UNSIGNED DEFAULT NULL,
  `expected_cash` int UNSIGNED DEFAULT NULL,
  `cash_difference` int DEFAULT NULL,
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
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
  `quantity` int NOT NULL,
  `unit_price` int NOT NULL,
  `discount` int DEFAULT '0',
  `subtotal` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `color` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `channel` enum('online','pos') NOT NULL DEFAULT 'online',
  `fulfillment_type` enum('shipping','pickup','walk_in') NOT NULL DEFAULT 'shipping',
  `fulfillment_status` enum('unfulfilled','processing','ready_for_pickup','shipped','completed','cancelled') NOT NULL DEFAULT 'unfulfilled',
  `user_id` int DEFAULT NULL,
  `cashier_id` int DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_nim` varchar(25) DEFAULT NULL,
  `customer_email` varchar(100) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `shipping_address` text,
  `subtotal` int UNSIGNED NOT NULL DEFAULT '0',
  `discount_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `service_fee` int UNSIGNED NOT NULL DEFAULT '0',
  `shipping_cost` int UNSIGNED NOT NULL DEFAULT '0',
  `tax_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `gross_amount` int NOT NULL,
  `payment_status` enum('unpaid','pending','paid','expired','failed','refunded','partial_refund') NOT NULL DEFAULT 'unpaid',
  `order_status` enum('pending_payment','paid','processing','ready_for_pickup','shipped','completed','cancelled','refunded') NOT NULL DEFAULT 'pending_payment',
  `pickup_code` varchar(30) DEFAULT NULL,
  `pickup_location` varchar(255) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `courier_name` varchar(100) DEFAULT NULL,
  `shipped_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` varchar(255) DEFAULT NULL,
  `notes` text,
  `payment_type` varchar(50) DEFAULT NULL,
  `transaction_status` varchar(20) DEFAULT 'pending',
  `midtrans_transaction_id` varchar(100) DEFAULT NULL,
  `snap_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_discounts`
--

CREATE TABLE `order_discounts` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `promotion_id` bigint UNSIGNED DEFAULT NULL,
  `promo_code_snapshot` varchar(50) DEFAULT NULL,
  `discount_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `product_id` int DEFAULT NULL,
  `variant_id` int DEFAULT NULL,
  `product_name` varchar(150) NOT NULL,
  `size` varchar(30) NOT NULL DEFAULT 'One Size',
  `quantity` int NOT NULL,
  `unit_price` int UNSIGNED NOT NULL,
  `discount_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `subtotal` int NOT NULL,
  `color` varchar(50) NOT NULL DEFAULT 'Default',
  `sku_snapshot` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `provider` enum('midtrans','cash','debit','bank_transfer_manual','other') NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `amount` int UNSIGNED NOT NULL,
  `status` enum('pending','paid','expired','failed','cancelled','refunded','partial_refund') NOT NULL DEFAULT 'pending',
  `provider_transaction_id` varchar(150) DEFAULT NULL,
  `provider_reference` varchar(150) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `expired_at` datetime DEFAULT NULL,
  `raw_callback_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `sku_prefix` varchar(50) DEFAULT NULL,
  `description` text,
  `price` int NOT NULL,
  `cost_price` int UNSIGNED NOT NULL DEFAULT '0',
  `weight_gram` int UNSIGNED NOT NULL DEFAULT '0',
  `image_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `sku_prefix`, `description`, `price`, `cost_price`, `weight_gram`, `image_url`, `is_active`, `is_featured`, `created_at`, `updated_at`) VALUES
(1, 1, 'Varsity FILKOM Edition', 'varsity-filkom', NULL, 'Varsity premium dengan bordir logo FILKOM.', 185000, 0, 0, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 1, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(2, 1, 'Hoodie Code/Run', 'hoodie-code-run', NULL, 'Hoodie nyaman untuk ngoding semalaman.', 160000, 0, 0, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 1, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(3, 1, 'T-Shirt Debugging', 'tshirt-debugging', NULL, 'Kaos katun adem dengan desain programmer.', 85000, 0, 0, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400', 1, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(4, 2, 'Lanyard FILKOM Exclusive', 'lanyard-filkom', NULL, 'Lanyard untuk ID Card mahasiswa.', 25000, 0, 0, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=400', 1, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44');

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` int NOT NULL,
  `variant_id` int DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `sort_order` int UNSIGNED NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `variant_id`, `image_url`, `alt_text`, `sort_order`, `is_primary`, `created_at`) VALUES
(1, 1, NULL, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 'Varsity FILKOM Edition', 0, 1, '2026-06-24 12:49:24'),
(2, 2, NULL, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 'Hoodie Code/Run', 0, 1, '2026-06-24 12:49:24'),
(3, 3, NULL, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400', 'T-Shirt Debugging', 0, 1, '2026-06-24 12:49:24'),
(4, 4, NULL, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=400', 'Lanyard FILKOM Exclusive', 0, 1, '2026-06-24 12:49:24');

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `size` varchar(30) NOT NULL DEFAULT 'One Size',
  `stock` int NOT NULL DEFAULT '0',
  `stock_reserved` int UNSIGNED NOT NULL DEFAULT '0',
  `reorder_level` int UNSIGNED NOT NULL DEFAULT '0',
  `barcode` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `color` varchar(50) NOT NULL DEFAULT 'Default',
  `color_hex` char(7) DEFAULT NULL,
  `price_override` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `size`, `stock`, `stock_reserved`, `reorder_level`, `barcode`, `is_active`, `color`, `color_hex`, `price_override`, `created_at`, `updated_at`) VALUES
(1, 1, 'VARSITYF-0001', 'S', 7, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(2, 1, 'VARSITYF-0002', 'M', 25, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(3, 1, 'VARSITYF-0003', 'L', 30, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(4, 1, 'VARSITYF-0004', 'XL', 15, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(5, 2, 'HOODIECO-0005', 'S', 3, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(6, 2, 'HOODIECO-0006', 'M', 20, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(7, 2, 'HOODIECO-0007', 'L', 20, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(8, 2, 'HOODIECO-0008', 'XL', 10, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(9, 3, 'TSHIRTDE-0009', 'S', 15, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(10, 3, 'TSHIRTDE-0010', 'M', 40, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(11, 3, 'TSHIRTDE-0011', 'L', 50, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(12, 3, 'TSHIRTDE-0012', 'XL', 20, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(13, 4, 'LANYARDF-0013', 'All Size', 100, 0, 0, NULL, 1, 'Default', NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36');

-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

CREATE TABLE `promotions` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` int UNSIGNED NOT NULL,
  `max_discount_amount` int UNSIGNED DEFAULT NULL,
  `min_order_amount` int UNSIGNED NOT NULL DEFAULT '0',
  `quota_total` int UNSIGNED DEFAULT NULL,
  `quota_used` int UNSIGNED NOT NULL DEFAULT '0',
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `variant_id` int NOT NULL,
  `movement_type` enum('initial','sale','reservation','reservation_release','restock','adjustment_in','adjustment_out','return','refund') NOT NULL,
  `quantity_change` int NOT NULL,
  `stock_before` int UNSIGNED DEFAULT NULL,
  `stock_after` int UNSIGNED DEFAULT NULL,
  `reference_type` enum('order','stock_opname','purchase','return','manual') NOT NULL DEFAULT 'manual',
  `reference_id` varchar(50) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `stock_movements`
--

INSERT INTO `stock_movements` (`id`, `variant_id`, `movement_type`, `quantity_change`, `stock_before`, `stock_after`, `reference_type`, `reference_id`, `created_by`, `notes`, `created_at`) VALUES
(1, 5, 'initial', 3, 0, 3, 'manual', 'INITIAL-5', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(2, 1, 'initial', 7, 0, 7, 'manual', 'INITIAL-1', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(3, 8, 'initial', 10, 0, 10, 'manual', 'INITIAL-8', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(4, 4, 'initial', 15, 0, 15, 'manual', 'INITIAL-4', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(5, 9, 'initial', 15, 0, 15, 'manual', 'INITIAL-9', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(6, 6, 'initial', 20, 0, 20, 'manual', 'INITIAL-6', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(7, 7, 'initial', 20, 0, 20, 'manual', 'INITIAL-7', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(8, 12, 'initial', 20, 0, 20, 'manual', 'INITIAL-12', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(9, 2, 'initial', 25, 0, 25, 'manual', 'INITIAL-2', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(10, 3, 'initial', 30, 0, 30, 'manual', 'INITIAL-3', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(11, 10, 'initial', 40, 0, 40, 'manual', 'INITIAL-10', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(12, 11, 'initial', 50, 0, 50, 'manual', 'INITIAL-11', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(13, 13, 'initial', 100, 0, 100, 'manual', 'INITIAL-13', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20');

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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `homepage_layout` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `store_settings`
--

INSERT INTO `store_settings` (`id`, `store_name`, `address`, `phone`, `tax_rate`, `qris_static_url`, `updated_at`, `homepage_layout`) VALUES
(1, 'FILKOM Merch', 'Gedung BEM FILKOM UB', '081234567890', '0.00', NULL, '2026-06-24 10:13:11', '{\"heroTitle\":\"Wear\\nYour\\nFaculty.\",\"heroSubtitle\":\"Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat oleh mahasiswa, untuk mahasiswa premium, eksklusif, dan limited stock.\",\"heroSubLabel\":\"FILKOM MERCH 2026\",\"heroBtnText\":\"SHOP THE DROP\",\"heroImage\":\"\",\"marqueeText\":\"OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY \'25 OPEN | 100% PRODUK MAHASISWA | CASHBACK 5% MEMBER | OZZA GANTENG\"}');

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
  `role` enum('owner','admin','cashier','warehouse','customer') NOT NULL DEFAULT 'customer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `nim`, `email`, `password_hash`, `phone`, `address`, `role`, `created_at`, `updated_at`) VALUES
(1, 'Admin BEM FILKOM', '20515020000000', 'admin@filkom.ub.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567890', 'Gedung BEM FILKOM UB', 'admin', '2026-06-22 12:19:44', '2026-06-22 12:19:44'),
(2, 'Ozza Mahasiswa', '23515040000000', 'ozza@student.ub.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '089876543210', 'Jl. MT Haryono No. 165, Malang', 'customer', '2026-06-22 12:19:44', '2026-06-22 12:19:44');

-- --------------------------------------------------------

--
-- Table structure for table `user_addresses`
--

CREATE TABLE `user_addresses` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `label` varchar(50) NOT NULL DEFAULT 'Utama',
  `recipient_name` varchar(100) NOT NULL,
  `recipient_phone` varchar(20) NOT NULL,
  `address_detail` text NOT NULL,
  `district` varchar(100) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_logs_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_activity_logs_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `cashier_shifts`
--
ALTER TABLE `cashier_shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cashier_shifts_cashier_status` (`cashier_id`,`status`),
  ADD KEY `idx_cashier_shifts_opened_at` (`opened_at`);

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
  ADD UNIQUE KEY `uq_orders_pickup_code` (`pickup_code`),
  ADD KEY `idx_orders_channel_created` (`channel`,`created_at`),
  ADD KEY `idx_orders_payment_status_created` (`payment_status`,`created_at`),
  ADD KEY `idx_orders_order_status_created` (`order_status`,`created_at`),
  ADD KEY `idx_orders_cashier_created` (`cashier_id`,`created_at`),
  ADD KEY `idx_orders_user_created` (`user_id`,`created_at`);

--
-- Indexes for table `order_discounts`
--
ALTER TABLE `order_discounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_discounts_order` (`order_id`),
  ADD KEY `idx_order_discounts_promotion` (`promotion_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `idx_order_items_variant` (`variant_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payments_provider_transaction` (`provider`,`provider_transaction_id`),
  ADD KEY `idx_payments_order` (`order_id`),
  ADD KEY `idx_payments_status_created` (`status`,`created_at`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_images_product` (`product_id`),
  ADD KEY `idx_product_images_variant` (`variant_id`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_variants_product_size_color` (`product_id`,`size`,`color`),
  ADD UNIQUE KEY `uq_product_variants_sku` (`sku`),
  ADD UNIQUE KEY `uq_product_variants_barcode` (`barcode`),
  ADD KEY `idx_product_variants_stock` (`stock`),
  ADD KEY `idx_product_variants_active` (`is_active`);

--
-- Indexes for table `promotions`
--
ALTER TABLE `promotions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_promotions_code` (`code`),
  ADD KEY `idx_promotions_active_period` (`is_active`,`starts_at`,`ends_at`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stock_movements_variant_created` (`variant_id`,`created_at`),
  ADD KEY `idx_stock_movements_reference` (`reference_type`,`reference_id`),
  ADD KEY `idx_stock_movements_created_by` (`created_by`);

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
-- Indexes for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_addresses_user` (`user_id`),
  ADD KEY `idx_user_addresses_default` (`user_id`,`is_default`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cashier_shifts`
--
ALTER TABLE `cashier_shifts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `offline_sales`
--
ALTER TABLE `offline_sales`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `offline_sale_items`
--
ALTER TABLE `offline_sale_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_discounts`
--
ALTER TABLE `order_discounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
-- AUTO_INCREMENT for table `user_addresses`
--
ALTER TABLE `user_addresses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cashier_shifts`
--
ALTER TABLE `cashier_shifts`
  ADD CONSTRAINT `fk_cashier_shifts_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `offline_sale_items`
--
ALTER TABLE `offline_sale_items`
  ADD CONSTRAINT `offline_sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `offline_sales` (`sale_id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_discounts`
--
ALTER TABLE `order_discounts`
  ADD CONSTRAINT `fk_order_discounts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_discounts_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_images_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_stock_movements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_movements_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD CONSTRAINT `fk_user_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
