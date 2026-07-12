-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 11, 2026 at 05:44 PM
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
  `actor_name_snapshot` varchar(150) DEFAULT NULL,
  `actor_role` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` text,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `actor_name_snapshot`, `actor_role`, `action`, `description`, `entity_type`, `entity_id`, `old_data`, `new_data`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'Admin BEM FILKOM', 'admin', 'update_product', 'Produk \"Lanyard FILKOM Exclusive\" diperbarui oleh Admin BEM FILKOM', 'product', '4', NULL, NULL, NULL, NULL, '2026-06-25 20:30:14'),
(2, NULL, 'vfgd', 'customer', 'create_order', 'Pesanan online dibuat untuk vfgd (POS-1782451785768)', 'order', 'POS-1782451785768', NULL, NULL, NULL, NULL, '2026-06-26 05:29:47'),
(3, 1, 'Admin BEM FILKOM', 'admin', 'create_product', 'Produk \"wwswe\" ditambahkan oleh Admin BEM FILKOM', 'product', '7', NULL, NULL, NULL, NULL, '2026-06-26 10:45:11'),
(4, NULL, 'riz', 'customer', 'create_order', 'Pesanan online dibuat untuk riz (FILKOM-1782476047167)', 'order', 'FILKOM-1782476047167', NULL, NULL, NULL, NULL, '2026-06-26 12:14:08'),
(5, 9, 'Niken Nur Baiti', 'customer', 'create_order', 'Pesanan online dibuat untuk Niken Nur Baiti (FILKOM-1782478391099)', 'order', 'FILKOM-1782478391099', NULL, NULL, NULL, NULL, '2026-06-26 12:53:10'),
(6, NULL, 'riz', 'customer', 'create_order', 'Pesanan online dibuat untuk riz (FILKOM-1782485185532)', 'order', 'FILKOM-1782485185532', NULL, NULL, NULL, NULL, '2026-06-26 14:46:26'),
(7, 1, 'Admin BEM FILKOM', 'admin', 'update_category', 'Kategori \"Apparel\" diperbarui oleh Admin BEM FILKOM', 'category', '1', NULL, NULL, NULL, NULL, '2026-06-26 14:48:22'),
(8, NULL, 'Niken ', 'customer', 'create_order', 'Pesanan online dibuat untuk Niken  (POS-1782486016126)', 'order', 'POS-1782486016126', NULL, NULL, NULL, NULL, '2026-06-26 15:00:16'),
(9, 1, 'Kasir POS', 'cashier', 'create_sale', 'Transaksi POS langsung dibuat oleh Kasir (POS-1782486034215)', 'order', 'POS-1782486034215', NULL, NULL, NULL, NULL, '2026-06-26 15:00:34'),
(10, 1, 'Kasir POS', 'cashier', 'create_sale', 'Transaksi POS langsung dibuat oleh Kasir (POS-1782486058849)', 'order', 'POS-1782486058849', NULL, NULL, NULL, NULL, '2026-06-26 15:00:58'),
(11, NULL, 'Pelanggan POS', 'customer', 'create_order', 'Pesanan online dibuat untuk Pelanggan POS (POS-1782486146144)', 'order', 'POS-1782486146144', NULL, NULL, NULL, NULL, '2026-06-26 15:02:26'),
(12, 1, 'Admin BEM FILKOM', 'admin', 'create_user', 'Pengguna \"Rafi\" (cashier) dibuat oleh Admin BEM FILKOM', 'user', '10', NULL, NULL, NULL, NULL, '2026-06-26 15:05:58'),
(13, NULL, 'Brawijaya Buyer', 'customer', 'create_order', 'Pesanan online dibuat untuk Brawijaya Buyer (FILKOM-1782545650729)', 'order', 'FILKOM-1782545650729', NULL, NULL, NULL, NULL, '2026-06-27 07:34:12'),
(14, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-06-27 14:19:17'),
(15, NULL, 'Rizwanda Keysha', 'customer', 'create_order', 'Pesanan online dibuat untuk Rizwanda Keysha (FILKOM-1782574331232)', 'order', 'FILKOM-1782574331232', NULL, NULL, NULL, NULL, '2026-06-27 15:32:13'),
(16, NULL, 'Rizwanda Keysha Cahya Putra', 'customer', 'create_order', 'Pesanan online dibuat untuk Rizwanda Keysha Cahya Putra (FILKOM-1782662703545)', 'order', 'FILKOM-1782662703545', NULL, NULL, NULL, NULL, '2026-06-28 16:05:05'),
(17, 1, 'Kasir POS', 'cashier', 'create_sale', 'Transaksi POS langsung dibuat oleh Kasir (POS-1782830773162)', 'order', 'POS-1782830773162', NULL, NULL, NULL, NULL, '2026-06-30 14:46:13'),
(18, NULL, 'Pelanggan POS', 'customer', 'create_order', 'Pesanan online dibuat untuk Pelanggan POS (POS-1782830786242)', 'order', 'POS-1782830786242', NULL, NULL, NULL, NULL, '2026-06-30 14:46:27'),
(19, NULL, 'Pelanggan POS', 'customer', 'create_order', 'Pesanan online dibuat untuk Pelanggan POS (POS-1782910581509)', 'order', 'POS-1782910581509', NULL, NULL, NULL, NULL, '2026-07-01 12:56:24'),
(20, NULL, 'Pelanggan POS', 'customer', 'create_order', 'Pesanan online dibuat untuk Pelanggan POS (POS-1782910609299)', 'order', 'POS-1782910609299', NULL, NULL, NULL, NULL, '2026-07-01 12:56:50'),
(21, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 10 dihapus oleh Admin BEM FILKOM', 'user', '10', NULL, NULL, NULL, NULL, '2026-07-07 20:14:44'),
(22, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 6 dihapus oleh Admin BEM FILKOM', 'user', '6', NULL, NULL, NULL, NULL, '2026-07-07 20:15:04'),
(23, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 13 dihapus oleh Admin BEM FILKOM', 'user', '13', NULL, NULL, NULL, NULL, '2026-07-07 20:48:49'),
(24, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 3 dihapus oleh Admin BEM FILKOM', 'user', '3', NULL, NULL, NULL, NULL, '2026-07-07 20:56:00'),
(25, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 2 dihapus oleh Admin BEM FILKOM', 'user', '2', NULL, NULL, NULL, NULL, '2026-07-07 20:56:10'),
(26, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 8 dihapus oleh Admin BEM FILKOM', 'user', '8', NULL, NULL, NULL, NULL, '2026-07-07 20:56:12'),
(27, 1, 'Admin BEM FILKOM', 'admin', 'delete_user', 'Pengguna ID 11 dihapus oleh Admin BEM FILKOM', 'user', '11', NULL, NULL, NULL, NULL, '2026-07-07 20:56:19'),
(28, 1, 'Admin BEM FILKOM', 'admin', 'update_user', 'Pengguna \"Rizwanda Keysha Cahya Putra\" (admin) diperbarui oleh Admin BEM FILKOM', 'user', '14', NULL, NULL, NULL, NULL, '2026-07-07 20:57:09'),
(29, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 04:31:52'),
(30, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 04:36:50'),
(31, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 04:48:33'),
(32, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 07:25:54'),
(33, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 08:10:44'),
(34, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 09:06:32'),
(35, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 09:15:55'),
(36, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 09:27:06'),
(37, 1, 'Admin BEM FILKOM', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Admin BEM FILKOM', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 14:02:53'),
(38, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'create_user', 'Pengguna \"Kasir Aja\" (cashier) dibuat oleh Rizwanda Keysha Cahya Putra', 'user', '15', NULL, NULL, NULL, NULL, '2026-07-08 14:23:08'),
(39, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 14:29:21'),
(40, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 16:16:13'),
(41, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 16:33:29'),
(42, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 16:33:37'),
(43, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 16:44:22'),
(44, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_user', 'Pengguna \"Rizwanda Keysha Cahya Putra\" (admin) diperbarui oleh Rizwanda Keysha Cahya Putra', 'user', '14', NULL, NULL, NULL, NULL, '2026-07-08 17:15:33'),
(45, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 18:23:22'),
(46, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 18:24:25'),
(47, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-08 18:26:23'),
(48, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-10 15:46:51'),
(49, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-10 15:54:57'),
(50, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-10 16:18:42'),
(51, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-10 16:30:43'),
(52, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:07:25'),
(53, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:08:28'),
(54, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:10:34'),
(55, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:14:08'),
(56, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:23:45'),
(57, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:24:18'),
(58, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:28:16'),
(59, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:36:59'),
(60, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:37:45'),
(61, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:42:44'),
(62, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 12:42:56'),
(63, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 13:45:53'),
(64, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 13:49:17'),
(65, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 13:58:18'),
(66, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_product', 'Produk \"wwswe\" diperbarui oleh Rizwanda Keysha Cahya Putra', 'product', '7', NULL, NULL, NULL, NULL, '2026-07-11 13:59:55'),
(67, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 14:01:48'),
(68, 14, 'Rizwanda Keysha Cahya Putra', 'admin', 'update_settings', 'Pengaturan toko diperbarui oleh Rizwanda Keysha Cahya Putra', 'settings', '1', NULL, NULL, NULL, NULL, '2026-07-11 14:02:56');

-- --------------------------------------------------------

--
-- Table structure for table `bundle_items`
--

CREATE TABLE `bundle_items` (
  `id` int NOT NULL,
  `bundle_product_id` int NOT NULL,
  `component_product_id` int NOT NULL,
  `quantity` int DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bundle_items`
--

INSERT INTO `bundle_items` (`id`, `bundle_product_id`, `component_product_id`, `quantity`) VALUES
(4, 7, 4, 1),
(5, 7, 3, 1),
(6, 7, 1, 1);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `created_at`, `is_active`) VALUES
(1, 'Apparel', 'apparel', '2026-06-22 12:19:44', 1),
(2, 'Accessories', 'accessories', '2026-06-22 12:19:44', 1),
(3, 'BAGS & LIFESTYLE', 'bags--lifestyle', '2026-06-24 14:36:00', 1),
(4, 'BARA SPECIAL EDITION', 'bara-special-edition', '2026-06-24 14:36:28', 1);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_proof_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_id`, `channel`, `fulfillment_type`, `fulfillment_status`, `user_id`, `cashier_id`, `customer_name`, `customer_nim`, `customer_email`, `customer_phone`, `shipping_address`, `subtotal`, `discount_amount`, `service_fee`, `shipping_cost`, `tax_amount`, `gross_amount`, `payment_status`, `order_status`, `pickup_code`, `pickup_location`, `tracking_number`, `courier_name`, `shipped_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `notes`, `payment_type`, `transaction_status`, `midtrans_transaction_id`, `snap_token`, `created_at`, `updated_at`, `payment_proof_url`) VALUES
(1, 'FILKOM-1782308851654', 'online', 'shipping', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', '235150601111041', 'rizwandakeysha@gmail.com', '085156563724', NULL, 25000, 0, 0, 0, 0, 25000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '7d40579c-6128-48ef-9153-c70ad111cba1', '2026-06-24 13:47:31', '2026-06-24 13:47:32', NULL),
(2, 'FILKOM-1782309016633', 'online', 'shipping', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', '235150601111041', 'rizwandakeysha@gmail.com', '851 5656 3724', NULL, 25000, 0, 0, 0, 0, 25000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '86269d0b-0436-4b14-8da2-a0371046a90d', '2026-06-24 13:50:16', '2026-06-24 13:50:17', NULL),
(3, 'FILKOM-1782309673362', 'online', 'shipping', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '085156563724', NULL, 25000, 0, 0, 0, 0, 25000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'c1420265-81a7-4af2-89ac-08e71ba6f0e7', '2026-06-24 14:01:13', '2026-06-24 14:01:16', NULL),
(4, 'FILKOM-1782310139947', 'online', 'shipping', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '085156563724', NULL, 25000, 0, 0, 0, 0, 25000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '584733df-dd99-4066-a077-47bdec8d784e', '2026-06-24 14:09:00', '2026-07-07 20:56:00', NULL),
(5, 'POS-1782311339180', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 370000, 0, 0, 0, 0, 370000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '08ed8c37-f059-4111-9a9b-8ab935d80fcd', '2026-06-24 14:28:59', '2026-06-24 14:28:59', NULL),
(6, 'FILKOM-1782313272544', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Brawijaya Buyer', '235150601111041', 'buyer@student.ub.ac.id', '0855666324', 'Ambil di FILKOM Merch (gratis)', 50000, 0, 0, 0, 0, 50000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '1e263e49-b7b2-4627-9e7e-77fe97d83f41', '2026-06-24 15:01:14', '2026-06-24 15:01:15', NULL),
(7, 'FILKOM-1782313372239', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Brawijaya Buyer', NULL, 'buyer@student.ub.ac.id', '0855666324', 'Ambil di FILKOM Merch (gratis)', 50000, 0, 0, 0, 0, 50000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '5a1ac6df-7064-42f8-9133-5bc6c4b306fc', '2026-06-24 15:02:53', '2026-06-24 15:02:54', NULL),
(8, 'FILKOM-1782313402077', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Brawijaya Buyer', NULL, 'buyer@student.ub.ac.id', '0855666324', 'Ambil di FILKOM Merch (gratis)', 50000, 0, 0, 0, 0, 50000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '0c6538c9-b68b-4143-8360-0b3248a91318', '2026-06-24 15:03:23', '2026-06-24 15:03:23', NULL),
(9, 'FILKOM-1782313451183', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '0855666324', 'Ambil di FILKOM Merch (gratis)', 50000, 0, 0, 0, 0, 50000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '9167bbbf-99fa-4cfe-9562-98b9c333c643', '2026-06-24 15:04:12', '2026-07-07 20:56:00', NULL),
(10, 'FILKOM-1782313504462', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '0855666324', 'Ambil di FILKOM Merch (gratis)', 50000, 0, 0, 0, 0, 50000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'db14c3fa-3b4d-44d7-b699-ff79de17bc73', '2026-06-24 15:05:05', '2026-07-07 20:56:00', NULL),
(11, 'POS-1782317700176', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'dfs', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 245000, 0, 0, 0, 0, 245000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '3b2e29c3-9402-4198-94a6-9b6a1fcc976c', '2026-06-24 16:15:00', '2026-06-24 16:15:00', NULL),
(12, 'POS-1782317762215', 'pos', 'walk_in', 'completed', NULL, 1, 'budi', NULL, 'pos@filkommerch.com', '081234567890', NULL, 210000, 0, 0, 0, 0, 210000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-24 16:16:02', '2026-06-24 16:16:02', NULL),
(13, 'POS-1782317859177', 'pos', 'walk_in', 'completed', NULL, 1, 'Pelanggan POS', NULL, 'pos@filkommerch.com', '081234567890', NULL, 345000, 0, 0, 0, 0, 345000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-24 16:17:39', '2026-06-24 16:17:39', NULL),
(14, 'POS-1782318676930', 'pos', 'walk_in', 'completed', NULL, 1, 'Pelanggan POS', NULL, 'pos@filkommerch.com', '081234567890', NULL, 270000, 0, 0, 0, 0, 270000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-24 16:31:16', '2026-06-24 16:31:16', NULL),
(15, 'POS-1782319020525', 'pos', 'walk_in', 'completed', NULL, 1, 'Pelanggan POS', NULL, 'pos@filkommerch.com', '081234567890', NULL, 245000, 0, 0, 0, 0, 245000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-24 16:37:00', '2026-06-24 16:37:00', NULL),
(16, 'POS-1782319104691', 'pos', 'walk_in', 'completed', NULL, 1, 'Pelanggan POS', NULL, 'pos@filkommerch.com', '081234567890', NULL, 185000, 0, 0, 0, 0, 185000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-24 16:38:24', '2026-06-24 16:38:24', NULL),
(17, 'FILKOM-1782319204171', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '669888', 'Ambil di FILKOM Merch (gratis)', 50000, 0, 0, 0, 0, 50000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '8cfb1b03-6f31-4f19-ab3d-032205e8bd27', '2026-06-24 16:40:05', '2026-07-07 20:56:00', NULL),
(18, 'FILKOM-1782319757932', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '085156563724', 'Ambil di FILKOM Merch (gratis)', 160000, 0, 0, 0, 0, 160000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '9f4868f7-f04c-475c-9b93-8024c234e541', '2026-06-24 16:49:18', '2026-06-24 16:49:18', NULL),
(19, 'FILKOM-1782319808240', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '851 5656 3724', 'Ambil di FILKOM Merch (gratis)', 160000, 0, 0, 0, 0, 160000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '8ea242f1-145d-4c1a-b25f-cbad7a12015e', '2026-06-24 16:50:08', '2026-07-07 20:56:00', NULL),
(20, 'FILKOM-1782320166451', 'online', 'pickup', 'unfulfilled', 4, NULL, 'Muhammmad dzakwan Ikram', '245150301111019', 'banjarb97@gmail.com', '34567', 'Ambil di FILKOM Merch (gratis)', 75000, 0, 0, 0, 0, 75000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '62771853-9d56-48ef-a10d-e1ea1de3f876', '2026-06-24 16:56:06', '2026-06-24 16:56:07', NULL),
(21, 'FILKOM-1782401653820', 'online', 'pickup', 'unfulfilled', 5, NULL, 'Ini ozza Pokoknya', '64579776', 'mahlikali4@gmail.com', '898897996', 'Ambil di FILKOM Merch (gratis)', 25000, 0, 0, 0, 0, 25000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '92a45882-c2fc-4be9-b5c7-53ddc0484cd4', '2026-06-25 15:34:13', '2026-06-25 15:34:13', NULL),
(22, 'FILKOM-1782403985641', 'online', 'pickup', 'unfulfilled', 5, NULL, 'Ini ozza Pokoknya', '64579776', 'mahlikali4@gmail.com', '234t', 'Ambil di FILKOM Merch (gratis)', 925000, 0, 0, 0, 0, 925000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '57678e4d-1224-4dfa-9e9f-84ca8082302b', '2026-06-25 16:13:04', '2026-06-25 16:13:05', NULL),
(23, 'POS-1782451785768', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'vfgd', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 210000, 0, 0, 0, 0, 210000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'ba82b34e-315e-4cf9-9204-72795a182706', '2026-06-26 05:29:46', '2026-06-26 05:29:47', NULL),
(24, 'FILKOM-1782476047167', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'riz', '235150601111041', 'rizwandaak@gmail.com', '085156563724', 'Ambil di FILKOM Merch (gratis)', 25000, 0, 0, 0, 0, 25000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'f54c6839-796b-44f4-a139-efcfa321415b', '2026-06-26 12:14:07', '2026-07-07 20:56:12', NULL),
(25, 'FILKOM-1782478391099', 'online', 'pickup', 'unfulfilled', 9, NULL, 'Niken Nur Baiti', '245150707111016', 'nikennurbaiti@student.ub.ac.id', '082139797291', 'Ambil di FILKOM Merch (gratis)', 85000, 0, 0, 0, 0, 85000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'f7f62ed9-543d-4618-ad94-a802bdd1a56c', '2026-06-26 12:53:10', '2026-06-26 12:53:10', NULL),
(26, 'FILKOM-1782485185532', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'riz', NULL, 'rizwandaak@gmail.com', '085156563724', 'Ambil di FILKOM Merch (gratis)', 45000, 0, 0, 0, 0, 45000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '1a9f4fc0-ac53-4a6b-a0c9-a2404706f326', '2026-06-26 14:46:25', '2026-07-07 20:56:12', NULL),
(27, 'POS-1782486016126', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'Niken ', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 85000, 0, 0, 0, 0, 85000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'c1fd56ab-c560-48a5-832f-cc5d7ce02b0c', '2026-06-26 15:00:16', '2026-06-26 15:00:16', NULL),
(28, 'POS-1782486034215', 'pos', 'walk_in', 'completed', NULL, 1, 'Niken ', NULL, 'pos@filkommerch.com', '081234567890', NULL, 85000, 0, 0, 0, 0, 85000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-26 15:00:34', '2026-06-26 15:00:34', NULL),
(29, 'POS-1782486058849', 'pos', 'walk_in', 'completed', NULL, 1, 'Pelanggan POS', NULL, 'pos@filkommerch.com', '081234567890', NULL, 25000, 0, 0, 0, 0, 25000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-26 15:00:58', '2026-06-26 15:00:58', NULL),
(30, 'POS-1782486146144', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 45000, 0, 0, 0, 0, 45000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'bc477d49-3eee-47d8-892e-7d17a86f0b36', '2026-06-26 15:02:26', '2026-06-26 15:02:26', NULL),
(31, 'FILKOM-1782545650729', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Brawijaya Buyer', NULL, 'buyer@student.ub.ac.id', '085157238', 'Ambil di FILKOM Merch (gratis)', 45000, 0, 0, 0, 0, 45000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'd711c2af-a5d8-4816-8b51-b98764cd5601', '2026-06-27 07:34:10', '2026-07-07 20:56:19', NULL),
(32, 'FILKOM-1782574331232', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha', NULL, 'rizwandakeysha@gmail.com', '0855666324', 'Ambil di FILKOM Merch (gratis)', 45000, 0, 0, 0, 0, 45000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'db8f6430-293c-4fb4-8c8a-fc6b0c7fc188', '2026-06-27 15:32:12', '2026-07-07 20:56:00', NULL),
(33, 'FILKOM-1782662703545', 'online', 'pickup', 'unfulfilled', NULL, NULL, 'Rizwanda Keysha Cahya Putra', NULL, 'rizwandakeysha@student.ub.ac.id', '085156563724', 'Ambil di FILKOM Merch (gratis)', 160000, 0, 0, 0, 0, 160000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '92cb7416-a4c8-40b7-b9db-fe7b64bb075a', '2026-06-28 16:05:04', '2026-07-07 20:15:04', NULL),
(34, 'POS-1782830773162', 'pos', 'walk_in', 'completed', NULL, 1, 'Pelanggan POS', NULL, 'pos@filkommerch.com', '081234567890', NULL, 85000, 0, 0, 0, 0, 85000, 'paid', 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'settlement', NULL, NULL, '2026-06-30 14:46:13', '2026-06-30 14:46:13', NULL),
(35, 'POS-1782830786242', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 85000, 0, 0, 0, 0, 85000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '4e551bd2-1eef-4633-9a6d-3ff2266f2a95', '2026-06-30 14:46:27', '2026-06-30 14:46:27', NULL),
(36, 'POS-1782910581509', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 85000, 0, 0, 0, 0, 85000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, '24e0794b-6e55-4db6-82c6-edb1559d79c5', '2026-07-01 12:56:22', '2026-07-01 12:56:24', NULL),
(37, 'POS-1782910609299', 'pos', 'shipping', 'unfulfilled', NULL, NULL, 'Pelanggan POS', NULL, 'pos.cashier@student.ub.ac.id', '081234567890', NULL, 85000, 0, 0, 0, 0, 85000, 'unpaid', 'pending_payment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'qris', 'pending', NULL, 'f8318b0f-b541-4fc4-8606-358b62a68b84', '2026-07-01 12:56:50', '2026-07-01 12:56:50', NULL);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `variant_id`, `product_name`, `size`, `quantity`, `unit_price`, `discount_amount`, `subtotal`, `color`, `sku_snapshot`, `created_at`) VALUES
(1, 'FILKOM-1782308851654', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-24 13:47:31'),
(2, 'FILKOM-1782309016633', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-24 13:50:16'),
(3, 'FILKOM-1782309673362', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-24 14:01:13'),
(4, 'FILKOM-1782310139947', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-24 14:09:00'),
(5, 'POS-1782311339180', 1, 3, 'Varsity FILKOM Edition', 'L', 1, 185000, 0, 185000, 'Default', 'VARSITYF-0003', '2026-06-24 14:28:59'),
(6, 'POS-1782311339180', 1, 1, 'Varsity FILKOM Edition', 'S', 1, 185000, 0, 185000, 'Default', 'VARSITYF-0001', '2026-06-24 14:28:59'),
(7, 'FILKOM-1782313272544', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 2, 25000, 0, 50000, 'Default', 'LANYARDF-0013', '2026-06-24 15:01:14'),
(8, 'FILKOM-1782313372239', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 2, 25000, 0, 50000, 'Default', 'LANYARDF-0013', '2026-06-24 15:02:53'),
(9, 'FILKOM-1782313402077', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 2, 25000, 0, 50000, 'Default', 'LANYARDF-0013', '2026-06-24 15:03:23'),
(10, 'FILKOM-1782313451183', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 2, 25000, 0, 50000, 'Default', 'LANYARDF-0013', '2026-06-24 15:04:12'),
(11, 'FILKOM-1782313504462', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 2, 25000, 0, 50000, 'Default', 'LANYARDF-0013', '2026-06-24 15:05:05'),
(12, 'POS-1782317700176', 2, 6, 'Hoodie Code/Run', 'M', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0006', '2026-06-24 16:15:00'),
(13, 'POS-1782317700176', 3, 12, 'T-Shirt Debugging', 'XL', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0012', '2026-06-24 16:15:00'),
(14, 'POS-1782317762215', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-24 16:16:02'),
(15, 'POS-1782317762215', 1, 3, 'Varsity FILKOM Edition', 'L', 1, 185000, 0, 185000, 'Default', 'VARSITYF-0003', '2026-06-24 16:16:02'),
(16, 'POS-1782317859177', 2, 5, 'Hoodie Code/Run', 'S', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0005', '2026-06-24 16:17:39'),
(17, 'POS-1782317859177', 1, 2, 'Varsity FILKOM Edition', 'M', 1, 185000, 0, 185000, 'Default', 'VARSITYF-0002', '2026-06-24 16:17:39'),
(18, 'POS-1782318676930', 1, 3, 'Varsity FILKOM Edition', 'L', 1, 185000, 0, 185000, 'Default', 'VARSITYF-0003', '2026-06-24 16:31:16'),
(19, 'POS-1782318676930', 3, 11, 'T-Shirt Debugging', 'L', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0011', '2026-06-24 16:31:16'),
(20, 'POS-1782319020525', 3, 10, 'T-Shirt Debugging', 'M', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0010', '2026-06-24 16:37:00'),
(21, 'POS-1782319020525', 2, 6, 'Hoodie Code/Run', 'M', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0006', '2026-06-24 16:37:00'),
(22, 'POS-1782319104691', 2, 5, 'Hoodie Code/Run', 'S', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0005', '2026-06-24 16:38:24'),
(23, 'POS-1782319104691', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-24 16:38:24'),
(24, 'FILKOM-1782319204171', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 2, 25000, 0, 50000, 'Default', 'LANYARDF-0013', '2026-06-24 16:40:05'),
(25, 'FILKOM-1782319757932', 2, 7, 'Hoodie Code/Run', 'L', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0007', '2026-06-24 16:49:18'),
(26, 'FILKOM-1782319808240', 2, 7, 'Hoodie Code/Run', 'L', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0007', '2026-06-24 16:50:08'),
(27, 'FILKOM-1782320166451', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 3, 25000, 0, 75000, 'Default', 'LANYARDF-0013', '2026-06-24 16:56:06'),
(28, 'FILKOM-1782401653820', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-25 15:34:13'),
(29, 'FILKOM-1782403985641', 1, 4, 'Varsity FILKOM Edition', 'XL', 5, 185000, 0, 925000, 'Default', 'VARSITYF-0004', '2026-06-25 16:13:04'),
(30, 'POS-1782451785768', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-26 05:29:46'),
(31, 'POS-1782451785768', 1, 3, 'Varsity FILKOM Edition', 'L', 1, 185000, 0, 185000, 'Default', 'VARSITYF-0003', '2026-06-26 05:29:46'),
(32, 'FILKOM-1782476047167', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-26 12:14:07'),
(33, 'FILKOM-1782478391099', 3, 11, 'T-Shirt Debugging', 'L', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0011', '2026-06-26 12:53:10'),
(34, 'FILKOM-1782485185532', 7, 14, 'wwswe', 'One Size', 1, 45000, 0, 45000, 'All Color', 'VAR-14', '2026-06-26 14:46:25'),
(35, 'POS-1782486016126', 3, 9, 'T-Shirt Debugging', 'S', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0009', '2026-06-26 15:00:16'),
(36, 'POS-1782486034215', 3, 9, 'T-Shirt Debugging', 'S', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0009', '2026-06-26 15:00:34'),
(37, 'POS-1782486058849', 4, 13, 'Lanyard FILKOM Exclusive', 'All Size', 1, 25000, 0, 25000, 'Default', 'LANYARDF-0013', '2026-06-26 15:00:58'),
(38, 'POS-1782486146144', 7, 14, 'wwswe', 'One Size', 1, 45000, 0, 45000, 'All Color', 'VAR-14', '2026-06-26 15:02:26'),
(39, 'FILKOM-1782545650729', 7, 14, 'wwswe', 'One Size', 1, 45000, 0, 45000, 'All Color', 'VAR-14', '2026-06-27 07:34:11'),
(40, 'FILKOM-1782574331232', 7, 14, 'wwswe', 'One Size', 1, 45000, 0, 45000, 'All Color', 'VAR-14', '2026-06-27 15:32:12'),
(41, 'FILKOM-1782662703545', 2, 7, 'Hoodie Code/Run', 'L', 1, 160000, 0, 160000, 'Default', 'HOODIECO-0007', '2026-06-28 16:05:04'),
(42, 'POS-1782830773162', 3, 12, 'T-Shirt Debugging', 'XL', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0012', '2026-06-30 14:46:13'),
(43, 'POS-1782830786242', 3, 11, 'T-Shirt Debugging', 'L', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0011', '2026-06-30 14:46:27'),
(44, 'POS-1782910581509', 3, 12, 'T-Shirt Debugging', 'XL', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0012', '2026-07-01 12:56:22'),
(45, 'POS-1782910609299', 3, 12, 'T-Shirt Debugging', 'XL', 1, 85000, 0, 85000, 'Default', 'TSHIRTDE-0012', '2026-07-01 12:56:50');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `order_id`, `provider`, `payment_method`, `amount`, `status`, `provider_transaction_id`, `provider_reference`, `paid_at`, `expired_at`, `raw_callback_json`, `created_at`, `updated_at`) VALUES
(1, 'POS-1782317762215', 'cash', 'Tunai', 210000, 'paid', NULL, NULL, '2026-06-24 23:16:02', NULL, NULL, '2026-06-24 16:16:02', '2026-06-24 16:16:02'),
(2, 'POS-1782317859177', 'cash', 'Tunai', 345000, 'paid', NULL, NULL, '2026-06-24 23:17:39', NULL, NULL, '2026-06-24 16:17:39', '2026-06-24 16:17:39'),
(3, 'POS-1782318676930', 'cash', 'Tunai', 270000, 'paid', NULL, NULL, '2026-06-24 23:31:16', NULL, NULL, '2026-06-24 16:31:16', '2026-06-24 16:31:16'),
(4, 'POS-1782319020525', 'cash', 'Tunai', 245000, 'paid', NULL, NULL, '2026-06-24 23:37:00', NULL, NULL, '2026-06-24 16:37:00', '2026-06-24 16:37:00'),
(5, 'POS-1782319104691', 'cash', 'Tunai', 185000, 'paid', NULL, NULL, '2026-06-24 23:38:24', NULL, NULL, '2026-06-24 16:38:24', '2026-06-24 16:38:24'),
(6, 'POS-1782486034215', 'cash', 'Tunai', 85000, 'paid', NULL, NULL, '2026-06-26 22:00:34', NULL, NULL, '2026-06-26 15:00:34', '2026-06-26 15:00:34'),
(7, 'POS-1782486058849', 'cash', 'Tunai', 25000, 'paid', NULL, NULL, '2026-06-26 22:00:58', NULL, NULL, '2026-06-26 15:00:58', '2026-06-26 15:00:58'),
(8, 'POS-1782830773162', 'cash', 'Tunai', 85000, 'paid', NULL, NULL, '2026-06-30 21:46:13', NULL, NULL, '2026-06-30 14:46:13', '2026-06-30 14:46:13');

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
  `filkom_price` int DEFAULT NULL,
  `promo_price` int DEFAULT NULL,
  `sale_type` enum('ready_stock','pre_order','limited_drop') DEFAULT 'ready_stock',
  `product_type` enum('apparel','lifestyle','accessory','collectible','bundle') DEFAULT 'apparel',
  `original_price` int DEFAULT NULL,
  `cost_price` int UNSIGNED NOT NULL DEFAULT '0',
  `low_stock_threshold` int DEFAULT '5',
  `weight_gram` int UNSIGNED NOT NULL DEFAULT '0',
  `image_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `preorder_start_at` timestamp NULL DEFAULT NULL,
  `preorder_end_at` timestamp NULL DEFAULT NULL,
  `preorder_moq` int DEFAULT NULL,
  `production_eta_days` int DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `is_best_seller` tinyint(1) DEFAULT '0',
  `is_limited` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bahan` varchar(255) DEFAULT NULL,
  `asal` varchar(255) DEFAULT NULL,
  `aplikasi` varchar(255) DEFAULT NULL,
  `size_chart_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `sku_prefix`, `description`, `price`, `filkom_price`, `promo_price`, `sale_type`, `product_type`, `original_price`, `cost_price`, `low_stock_threshold`, `weight_gram`, `image_url`, `is_active`, `preorder_start_at`, `preorder_end_at`, `preorder_moq`, `production_eta_days`, `is_featured`, `is_best_seller`, `is_limited`, `created_at`, `updated_at`, `bahan`, `asal`, `aplikasi`, `size_chart_url`) VALUES
(1, 1, 'Varsity FILKOM Edition', 'varsity-filkom', NULL, 'Varsity premium dengan bordir logo FILKOM.', 185000, NULL, NULL, 'ready_stock', 'apparel', NULL, 0, 5, 0, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 1, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44', NULL, NULL, NULL, NULL),
(2, 1, 'Hoodie Code/Run', 'hoodie-code-run', NULL, 'Hoodie nyaman untuk ngoding semalaman.', 160000, NULL, NULL, 'ready_stock', 'apparel', NULL, 0, 5, 0, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 1, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44', NULL, NULL, NULL, NULL),
(3, 1, 'T-Shirt Debugging', 'tshirt-debugging', NULL, 'Kaos katun adem dengan desain programmer.', 85000, NULL, NULL, 'ready_stock', 'apparel', 105000, 0, 5, 0, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400', 1, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-06-22 12:19:44', '2026-06-25 18:40:53', NULL, NULL, NULL, NULL),
(4, 2, 'Lanyard FILKOM Exclusive', 'lanyard-filkom', NULL, 'Lanyard untuk ID Card mahasiswa.', 25000, NULL, NULL, 'ready_stock', 'apparel', NULL, 0, 5, 0, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=400', 1, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-06-22 12:19:44', '2026-06-22 12:19:44', NULL, NULL, NULL, NULL),
(5, 1, 'w', 'w', NULL, NULL, 45000, 46000, NULL, 'ready_stock', 'bundle', 56000, 0, 5, 0, 'http://localhost:8080/uploads/files-1782470460603-466707499.png', 1, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-06-26 10:44:49', '2026-06-26 10:44:49', 'marsoto', NULL, NULL, NULL),
(7, 1, 'wwswe', 'wwswe', NULL, 'HALOOOOOO', 45000, 46000, NULL, 'ready_stock', 'bundle', 56000, 0, 5, 0, 'http://localhost:8080/uploads/files-1782470460603-466707499.png', 1, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-06-26 10:45:11', '2026-07-11 13:59:55', 'marsoto', NULL, NULL, NULL);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `variant_id`, `image_url`, `alt_text`, `sort_order`, `is_primary`, `created_at`) VALUES
(1, 1, NULL, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 'Varsity FILKOM Edition', 0, 1, '2026-06-24 12:49:24'),
(2, 2, NULL, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=400', 'Hoodie Code/Run', 0, 1, '2026-06-24 12:49:24'),
(9, 3, NULL, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400', 'T-Shirt Debugging', 0, 1, '2026-06-25 18:44:02'),
(10, 3, NULL, 'http://localhost:8080/uploads/files-1782413034907-600744432.png', 'T-Shirt Debugging', 1, 0, '2026-06-25 18:44:02'),
(11, 4, NULL, 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=400', 'Lanyard FILKOM Exclusive', 0, 1, '2026-06-25 20:30:14'),
(13, 7, NULL, 'http://localhost:8080/uploads/files-1782470460603-466707499.png', 'wwswe', 0, 1, '2026-07-11 13:59:55');

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
  `filkom_price` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_id`, `sku`, `size`, `stock`, `stock_reserved`, `reorder_level`, `barcode`, `is_active`, `color`, `color_hex`, `price_override`, `filkom_price`, `created_at`, `updated_at`) VALUES
(1, 1, 'VARSITYF-0001', 'S', 7, 1, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 14:28:59'),
(2, 1, 'VARSITYF-0002', 'M', 24, 0, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 16:17:39'),
(3, 1, 'VARSITYF-0003', 'L', 28, 2, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-26 05:29:46'),
(4, 1, 'VARSITYF-0004', 'XL', 15, 5, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-25 16:13:04'),
(5, 2, 'HOODIECO-0005', 'S', 1, 0, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 16:38:24'),
(6, 2, 'HOODIECO-0006', 'M', 19, 1, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 16:37:00'),
(7, 2, 'HOODIECO-0007', 'L', 20, 3, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-28 16:05:04'),
(8, 2, 'HOODIECO-0008', 'XL', 10, 0, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-24 12:46:36'),
(9, 3, 'TSHIRTDE-0009', 'S', 14, 1, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-26 15:00:34'),
(10, 3, 'TSHIRTDE-0010', 'M', 39, 0, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-25 18:44:02'),
(11, 3, 'TSHIRTDE-0011', 'L', 49, 2, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-30 14:46:27'),
(12, 3, 'TSHIRTDE-0012', 'XL', 19, 3, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-07-01 12:56:50'),
(13, 4, 'LANYARDF-0013', 'All Size', 97, 22, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-06-24 12:46:26', '2026-06-26 15:00:58'),
(14, 7, NULL, 'One Size', 50, 4, 0, NULL, 1, 'All Color', NULL, NULL, 45000, '2026-06-26 10:45:11', '2026-07-11 13:59:55'),
(15, 5, NULL, 'One Size', 50, 0, 0, NULL, 1, 'Default', NULL, NULL, NULL, '2026-07-08 14:39:52', '2026-07-08 14:39:52');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(13, 13, 'initial', 100, 0, 100, 'manual', 'INITIAL-13', NULL, 'Saldo stok saat migrasi database', '2026-06-24 13:00:20'),
(16, 13, 'reservation', 1, 100, 100, 'order', 'FILKOM-1782308851654', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 13:47:31'),
(17, 13, 'reservation', 1, 100, 100, 'order', 'FILKOM-1782309016633', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 13:50:16'),
(18, 13, 'reservation', 1, 100, 100, 'order', 'FILKOM-1782309673362', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 14:01:14'),
(19, 13, 'reservation', 1, 100, 100, 'order', 'FILKOM-1782310139947', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 14:09:00'),
(20, 3, 'reservation', 1, 30, 30, 'order', 'POS-1782311339180', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 14:28:59'),
(21, 1, 'reservation', 1, 7, 7, 'order', 'POS-1782311339180', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 14:28:59'),
(22, 13, 'reservation', 2, 100, 100, 'order', 'FILKOM-1782313272544', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 15:01:14'),
(23, 13, 'reservation', 2, 100, 100, 'order', 'FILKOM-1782313372239', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 15:02:53'),
(24, 13, 'reservation', 2, 100, 100, 'order', 'FILKOM-1782313402077', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 15:03:23'),
(25, 13, 'reservation', 2, 100, 100, 'order', 'FILKOM-1782313451183', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 15:04:12'),
(26, 13, 'reservation', 2, 100, 100, 'order', 'FILKOM-1782313504462', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 15:05:05'),
(27, 6, 'reservation', 1, 20, 20, 'order', 'POS-1782317700176', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 16:15:00'),
(28, 12, 'reservation', 1, 20, 20, 'order', 'POS-1782317700176', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 16:15:00'),
(29, 13, 'sale', -1, 99, 98, 'order', 'POS-1782317762215', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:16:02'),
(30, 3, 'sale', -1, 29, 28, 'order', 'POS-1782317762215', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:16:02'),
(31, 5, 'sale', -1, 2, 1, 'order', 'POS-1782317859177', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:17:39'),
(32, 2, 'sale', -1, 24, 23, 'order', 'POS-1782317859177', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:17:39'),
(33, 3, 'sale', -1, 28, 27, 'order', 'POS-1782318676930', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:31:16'),
(34, 11, 'sale', -1, 49, 48, 'order', 'POS-1782318676930', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:31:16'),
(35, 10, 'sale', -1, 39, 38, 'order', 'POS-1782319020525', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:37:00'),
(36, 6, 'sale', -1, 19, 18, 'order', 'POS-1782319020525', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:37:00'),
(37, 5, 'sale', -1, 1, 0, 'order', 'POS-1782319104691', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:38:24'),
(38, 13, 'sale', -1, 98, 97, 'order', 'POS-1782319104691', 1, 'Penjualan POS langsung selesai', '2026-06-24 16:38:24'),
(39, 13, 'reservation', 2, 98, 98, 'order', 'FILKOM-1782319204171', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 16:40:05'),
(40, 7, 'reservation', 1, 20, 20, 'order', 'FILKOM-1782319757932', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 16:49:18'),
(41, 7, 'reservation', 1, 20, 20, 'order', 'FILKOM-1782319808240', NULL, 'Reservasi stok pesanan online pending', '2026-06-24 16:50:08'),
(42, 13, 'reservation', 3, 98, 98, 'order', 'FILKOM-1782320166451', 4, 'Reservasi stok pesanan online pending', '2026-06-24 16:56:06'),
(43, 13, 'reservation', 1, 98, 98, 'order', 'FILKOM-1782401653820', 5, 'Reservasi stok pesanan online pending', '2026-06-25 15:34:13'),
(44, 4, 'reservation', 5, 15, 15, 'order', 'FILKOM-1782403985641', 5, 'Reservasi stok pesanan online pending', '2026-06-25 16:13:04'),
(45, 13, 'reservation', 1, 98, 98, 'order', 'POS-1782451785768', NULL, 'Reservasi stok pesanan online pending', '2026-06-26 05:29:46'),
(46, 3, 'reservation', 1, 28, 28, 'order', 'POS-1782451785768', NULL, 'Reservasi stok pesanan online pending', '2026-06-26 05:29:46'),
(47, 13, 'reservation', 1, 98, 98, 'order', 'FILKOM-1782476047167', NULL, 'Reservasi stok pesanan online pending', '2026-06-26 12:14:07'),
(48, 11, 'reservation', 1, 49, 49, 'order', 'FILKOM-1782478391099', 9, 'Reservasi stok pesanan online pending', '2026-06-26 12:53:10'),
(49, 14, 'reservation', 1, 50, 50, 'order', 'FILKOM-1782485185532', NULL, 'Reservasi stok pesanan online pending', '2026-06-26 14:46:25'),
(50, 9, 'reservation', 1, 15, 15, 'order', 'POS-1782486016126', NULL, 'Reservasi stok pesanan online pending', '2026-06-26 15:00:16'),
(51, 9, 'sale', -1, 14, 13, 'order', 'POS-1782486034215', 1, 'Penjualan POS langsung selesai', '2026-06-26 15:00:34'),
(52, 13, 'sale', -1, 97, 96, 'order', 'POS-1782486058849', 1, 'Penjualan POS langsung selesai', '2026-06-26 15:00:58'),
(53, 14, 'reservation', 1, 50, 50, 'order', 'POS-1782486146144', NULL, 'Reservasi stok pesanan online pending', '2026-06-26 15:02:26'),
(54, 14, 'reservation', 1, 50, 50, 'order', 'FILKOM-1782545650729', NULL, 'Reservasi stok pesanan online pending', '2026-06-27 07:34:11'),
(55, 14, 'reservation', 1, 50, 50, 'order', 'FILKOM-1782574331232', NULL, 'Reservasi stok pesanan online pending', '2026-06-27 15:32:12'),
(56, 7, 'reservation', 1, 20, 20, 'order', 'FILKOM-1782662703545', NULL, 'Reservasi stok pesanan online pending', '2026-06-28 16:05:04'),
(57, 12, 'sale', -1, 19, 18, 'order', 'POS-1782830773162', 1, 'Penjualan POS langsung selesai', '2026-06-30 14:46:13'),
(58, 11, 'reservation', 1, 49, 49, 'order', 'POS-1782830786242', NULL, 'Reservasi stok pesanan online pending', '2026-06-30 14:46:27'),
(59, 12, 'reservation', 1, 19, 19, 'order', 'POS-1782910581509', NULL, 'Reservasi stok pesanan online pending', '2026-07-01 12:56:22'),
(60, 12, 'reservation', 1, 19, 19, 'order', 'POS-1782910609299', NULL, 'Reservasi stok pesanan online pending', '2026-07-01 12:56:50');

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
  `homepage_layout` text,
  `payment_mode` varchar(20) DEFAULT 'midtrans'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `store_settings`
--

INSERT INTO `store_settings` (`id`, `store_name`, `address`, `phone`, `tax_rate`, `qris_static_url`, `updated_at`, `homepage_layout`, `payment_mode`) VALUES
(1, 'FILKOM Merch', 'FILKOM', '081234567890', '0.00', 'http://127.0.0.1:8080/uploads/file-1783771465501-562624007.jfif', '2026-07-11 14:02:56', '[{\"id\":\"default-marquee\",\"title\":\"Marquee Pengumuman\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-marquee\",\"type\":\"marquee\",\"config\":{\"text\":\"OFFICIAL MERCHANDISE FILKOM UB|PRE-ORDER BATCH #2 STARTING SOON!|KESEMPATAN EMAS DAPAT HARGA MIRING\"}}]},{\"id\":\"default-hero\",\"title\":\"Hero Banner Utama\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-hero\",\"type\":\"hero_banner\",\"config\":{\"title\":\"SHOW YOUR\\nFILKOM PRIDE!\",\"subtitle\":\"Dapatkan kesempatan membeli dan mendapatkan produk FILKOM Merchandise lebih awal dengan harga diskon up to 30%.\",\"subLabel\":\"PRE-ORDER BATCH #2\",\"btnText\":\"KE HALAMAN PRE-ORDER\",\"btnLink\":\"/pre-order\",\"image\":\"http://127.0.0.1:8080/uploads/file-1783771681395-509614541.jpg\",\"images\":[\"http://127.0.0.1:8080/uploads/file-1783771681395-509614541.jpg\",\"http://127.0.0.1:8080/uploads/file-1783771692985-152913621.jpg\",\"http://127.0.0.1:8080/uploads/file-1783771704458-72271194.jpg\",\"http://127.0.0.1:8080/uploads/file-1783771822171-440294417.jpg\",\"http://127.0.0.1:8080/uploads/file-1783771831573-600610850.jpg\"],\"showCountdown\":true,\"countdownEnd\":\"2026-07-20T00:00:00\",\"showLookbookBtn\":false,\"countdownLabel\":\"PRE-ORDER AKAN DIBUKA DALAM\",\"lookbookBtnText\":\"\"}}]},{\"id\":\"default-featured\",\"title\":\"Koleksi Unggulan\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-featured\",\"type\":\"product_grid\",\"config\":{\"title\":\"OUR MAIN HERO\",\"subtitle\":\"CHOOSE YOUR LOOK\",\"source\":\"slugs\",\"slugs\":\"work-jacket,half-zip,tumbler-stainless,boneka-bara,w,wwswe\",\"maxItems\":6}}]},{\"id\":\"default-categories\",\"title\":\"Kategori Pilihan\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-categories\",\"type\":\"category_showcase\",\"config\":{\"title\":\"Shop By Categories\"}}]},{\"id\":\"default-about\",\"title\":\"Tentang Kami (About FM)\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-about\",\"type\":\"text_block\",\"config\":{\"title\":\"More than Merchandise.\",\"subtitle\":\"ABOUT FILKOM MERCHANDISE\",\"body\":\"FILKOM Merchandise (FM) adalah unit resmi merchandise Fakultas Ilmu Komputer Universitas Brawijaya yang dikelola secara profesional oleh mahasiswa. Kami bertekad menjadi wadah kreativitas dan kebanggaan civitas akademika dengan menghadirkan produk eksklusif berkualitas premium, sekaligus mendukung inovasi mahasiswa di lingkungan kampus.\",\"alignment\":\"center\"}}]},{\"id\":\"default-limited\",\"title\":\"Limited Drop Campaign\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-limited\",\"type\":\"limited_drop\",\"config\":{\"title\":\"Varsity Jacket\",\"subtitle\":\"Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.\",\"productSlug\":\"varsity-filkom\",\"image\":\"\",\"countdownEnd\":\"2026-08-05T23:59:59+07:00\",\"stockMax\":100,\"stockCurrent\":70}}]},{\"id\":\"default-bundle\",\"title\":\"Rekomendasi Bundling\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-bundle\",\"type\":\"bundle_recommendation\",\"config\":{\"title\":\"Exclusive Bundles\",\"subtitle\":\"SPECIAL SAVINGS PACKS\",\"items\":[{\"name\":\"Freshman Starter Pack\",\"price\":\"Rp 120.000\",\"originalPrice\":\"Rp 145.000\",\"image\":\"\",\"description\":\"Paket lengkap maba untuk tampil keren di kampus baru.\",\"itemsList\":\"Kaos Premium, Totebag Canvas, Sticker Pack\",\"link\":\"/products\"},{\"name\":\"Premium Varsity Bundle\",\"price\":\"Rp 320.000\",\"originalPrice\":\"Rp 370.000\",\"image\":\"\",\"description\":\"Kombinasi varsity eksklusif dan notebook untuk ngampus.\",\"itemsList\":\"Varsity Jacket, Notebook Exclusive, Tumbler Stainless\",\"link\":\"/products\"}]}}]},{\"id\":\"default-why\",\"title\":\"Value Proposition\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-why\",\"type\":\"value_props\",\"config\":{\"items\":[{\"title\":\"Designed by Students\",\"description\":\"Setiap detail dirancang untuk merepresentasikan kehidupan perkuliahan di FILKOM.\"},{\"title\":\"Official Merchandise\",\"description\":\"Satu-satunya penyedia merchandise berlisensi resmi di bawah BEM & Fakultas.\"},{\"title\":\"Premium Materials\",\"description\":\"Jaminan bahan nyaman, awet, dan nyaman dipakai harian.\"},{\"title\":\"Support Innovation\",\"description\":\"Seluruh hasil penjualan dialokasikan untuk mendukung kegiatan dan inovasi kemahasiswaan.\"}]}}]},{\"id\":\"default-gallery\",\"title\":\"Lifestyle Gallery\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-gallery\",\"type\":\"gallery\",\"config\":{\"title\":\"Campus Lookbook\",\"subtitle\":\"@FILKOMMERCH\",\"items\":[{\"id\":\"g1\",\"image\":\"\",\"caption\":\"Varsity jacket di gazebo\"},{\"id\":\"g2\",\"image\":\"\",\"caption\":\"Ngoding pake hoodie premium\"},{\"id\":\"g3\",\"image\":\"\",\"caption\":\"Totebag praktis kuliah\"},{\"id\":\"g4\",\"image\":\"\",\"caption\":\"Lifestyle kaos debugging\"}]}}]},{\"id\":\"default-testimonial\",\"title\":\"Testimonial Pelanggan\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-testimonial\",\"type\":\"testimonial\",\"config\":{\"title\":\"Campus Voices\",\"subtitle\":\"TESTIMONIALS\",\"items\":[{\"id\":\"t1\",\"name\":\"Rizwan Dak\",\"role\":\"Informatika 2024\",\"content\":\"Varsity-nya tebal banget, bordirannya rapi pol. Nyaman buat dipake kuliah seharian di ruangan AC FILKOM.\"},{\"id\":\"t2\",\"name\":\"Ahmad Jauhari\",\"role\":\"Sistem Informasi 2023\",\"content\":\"Desain kaos debugging-nya relate banget sama kehidupan anak IT. Bahan katun combed-nya adem dan ga gampang melar.\"}]}}]},{\"id\":\"default-faq\",\"title\":\"Pertanyaan Umum (FAQ)\",\"enabled\":true,\"elements\":[{\"id\":\"default-el-faq\",\"type\":\"faq\",\"config\":{\"items\":[{\"id\":\"size\",\"q\":\"Apakah barang pre-order bisa dikirim ke luar kota?\",\"a\":\"Bisa bro/sis! Kami menyediakan opsi pengiriman reguler J&T/JNE ke seluruh Indonesia selain opsi Ambil di Gazebo FILKOM UB.\"},{\"id\":\"po\",\"q\":\"Berapa lama proses produksi Pre-Order?\",\"a\":\"Proses produksi memakan waktu sekitar 14-21 hari kerja setelah sesi Pre-Order ditutup secara resmi.\"},{\"id\":\"pickup\",\"q\":\"Bagaimana cara memilih ukuran yang pas (sizing)?\",\"a\":\"Setiap halaman produk dilengkapi dengan Size Chart lengkap. Kami merekomendasikan mengukur kaos atau jaket Anda yang biasa dipakai lalu mencocokkannya.\"},{\"id\":\"refund\",\"q\":\"Apakah bisa mengajukan pengembalian (refund)?\",\"a\":\"Refund hanya diperbolehkan apabila terdapat kesalahan pengiriman produk atau cacat produksi major dari vendor kami.\"}]}}]}]', 'midtrans');

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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_filkom_verified` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `nim`, `email`, `password_hash`, `phone`, `address`, `role`, `created_at`, `updated_at`, `is_filkom_verified`) VALUES
(1, 'Admin BEM FILKOM', '20515020000000', 'admin@filkom.ub.ac.id', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '081234567890', 'Gedung BEM FILKOM UB', 'admin', '2026-06-22 12:19:44', '2026-06-22 12:19:44', 0),
(4, 'Muhammmad dzakwan Ikram', NULL, 'banjarb97@gmail.com', '$2b$10$hSYJEVh1gEPSWL9aXo/O1.VjW/1rezqEDzYDhYg1Qq4MbMuOTR7we', NULL, NULL, 'customer', '2026-06-24 16:46:30', '2026-06-24 16:46:30', 0),
(5, 'Ini ozza Pokoknya', NULL, 'mahlikali4@gmail.com', '$2b$10$YSCfovnRf5Kvch5ci5pQx.oN42ApwzZHp3csOzMvb3I/Os3p2hWIq', NULL, NULL, 'customer', '2026-06-25 15:33:39', '2026-06-25 15:33:39', 0),
(7, 'BEM FILKOM UB', NULL, 'bemfilkom@ub.ac.id', '$2b$10$LXDGeBKP6Uu40KwfxlyF8eRTqThz4F7IVCTXSd5tazoSzsD.nW1Vq', NULL, NULL, 'customer', '2026-06-26 10:23:28', '2026-06-26 10:23:28', 0),
(9, 'Niken Nur Baiti', NULL, 'nikennurbaiti@student.ub.ac.id', '$2b$10$ZynN5BKHpn8l2R2jVqRYqO6ZhXgZC0FzJzXl8gE1uyWCFEroRL8Zq', NULL, NULL, 'customer', '2026-06-26 12:52:10', '2026-06-26 12:52:10', 0),
(12, 'Muhammad Dzakwan Ikram', NULL, 'dzakwangans@student.ub.ac.id', '$2b$10$0PkfIQqoZRlzmAK1mEUWxOFcmdWw48aedE38KmFGPd4O4XRPv3KQ6', NULL, NULL, 'customer', '2026-07-01 12:54:33', '2026-07-01 12:54:33', 0),
(14, 'Rizwanda Keysha Cahya Putra', '235150601111041', 'rizwandakeysha@student.ub.ac.id', '$2b$10$nr0m8Y2yvXOZdFWJ0Y8E6uwWQHkKlo6e.BVDtHgtPalgyzb3Lgrkq', NULL, NULL, 'admin', '2026-07-07 20:49:27', '2026-07-07 20:57:09', 1),
(15, 'Kasir Aja', NULL, 'kasir', '$2b$10$4Ny2NHCVYkGS5IMW4GEWxuR/ssva1PJRiEcmn5zETmRp8TsFvEMCC', NULL, NULL, 'cashier', '2026-07-08 14:23:08', '2026-07-08 14:23:08', 0);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- Indexes for table `bundle_items`
--
ALTER TABLE `bundle_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bundle_product_id` (`bundle_product_id`),
  ADD KEY `component_product_id` (`component_product_id`);

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `bundle_items`
--
ALTER TABLE `bundle_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `cashier_shifts`
--
ALTER TABLE `cashier_shifts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `order_discounts`
--
ALTER TABLE `order_discounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `store_settings`
--
ALTER TABLE `store_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
-- Constraints for table `bundle_items`
--
ALTER TABLE `bundle_items`
  ADD CONSTRAINT `bundle_items_ibfk_1` FOREIGN KEY (`bundle_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bundle_items_ibfk_2` FOREIGN KEY (`component_product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

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
