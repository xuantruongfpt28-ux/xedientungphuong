import React from 'react';
import { Modal, Descriptions, Tag, Typography, Space, Button } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  HomeOutlined,
  CarOutlined,
  CalendarOutlined,
  DollarOutlined,
  BankOutlined,
  ShopOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export interface Customer {
  id: number;
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  so_dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  identityCard?: string;
  cccd?: string;
  vehicleName?: string;
  ten_xe?: string;
  color?: string;
  mau_sac?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  so_acquy?: string;
  price?: number;
  gia_ban?: number;
  installmentBank?: string;
  ngan_hang_gop?: string;
  installmentAmount?: number;
  so_tien_gop?: number;
  purchaseDate?: string;
  ngay_mua?: string;
  created_at?: string;
  branch?: string;
  chi_nhanh?: string;
  note?: string;
  ghi_chu?: string;
}

interface CustomerDetailModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ open, customer, onClose }) => {
  if (!customer) return null;

  return (
    <Modal
      title={
        <Space>
          <UserOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>
            Thông Tin Chi Tiết Khách Hàng #{customer.id}
          </Title>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={800}
      centered
    >
      <div style={{ marginTop: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
          <Descriptions.Item label={<Space><UserOutlined /> Họ và Tên</Space>} span={2}>
            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
              {customer.fullName || customer.ho_ten || 'Khách chưa nhập tên'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Space><PhoneOutlined /> Số Điện Thoại</Space>}>
            {customer.phone || customer.so_dien_thoai ? (
              <Text copyable style={{ fontWeight: 600 }}>
                {customer.phone || customer.so_dien_thoai}
              </Text>
            ) : '---'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space><IdcardOutlined /> CCCD / CMND</Space>}>
            {customer.identityCard || customer.cccd || '---'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space><HomeOutlined /> Địa Chỉ</Space>} span={2}>
            {customer.address || customer.dia_chi || '---'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space><CarOutlined /> Tên Xe / Hãng</Space>} span={2}>
            <Text strong style={{ fontSize: 15 }}>
              {customer.vehicleName || customer.ten_xe || '---'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Màu Xe">
            {customer.color || customer.mau_sac ? (
              <Tag color="cyan">{customer.color || customer.mau_sac}</Tag>
            ) : '---'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space><CalendarOutlined /> Thời Gian Mua</Space>}>
            {customer.purchaseDate || customer.ngay_mua || customer.created_at
              ? dayjs(customer.purchaseDate || customer.ngay_mua || customer.created_at).format('DD/MM/YYYY HH:mm')
              : '---'}
          </Descriptions.Item>

          <Descriptions.Item label="Số Khung (VIN)">
            {customer.frameNumber || customer.so_khung ? (
              <Tag color="orange" style={{ fontWeight: 700 }}>
                {customer.frameNumber || customer.so_khung}
              </Tag>
            ) : '---'}
          </Descriptions.Item>

          <Descriptions.Item label="Số Acquy / Pin">
            {customer.batteryNumber || customer.so_pin || customer.so_acquy ? (
              <Tag color="green" style={{ fontWeight: 700 }}>
                {customer.batteryNumber || customer.so_pin || customer.so_acquy}
              </Tag>
            ) : '---'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space><DollarOutlined /> Giá Bán</Space>}>
            <Text type="danger" strong style={{ fontSize: 16 }}>
              {customer.price ?? customer.gia_ban
                ? `${Number(customer.price ?? customer.gia_ban).toLocaleString('vi-VN')} VNĐ`
                : '---'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label={<Space><BankOutlined /> Ngân Hàng Góp</Space>}>
            {customer.installmentBank || customer.ngan_hang_gop ? (
              <Tag color="purple">{customer.installmentBank || customer.ngan_hang_gop}</Tag>
            ) : (
              <Tag color="blue">Trả thẳng</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Số Tiền Góp">
            {customer.installmentAmount || customer.so_tien_gop
              ? `${Number(customer.installmentAmount || customer.so_tien_gop).toLocaleString('vi-VN')} VNĐ`
              : '0 VNĐ'}
          </Descriptions.Item>

          <Descriptions.Item label={<Space><ShopOutlined /> Chi Nhánh Mua</Space>}>
            <Tag color="geekblue">{customer.branch || customer.chi_nhanh || 'Chi nhánh 1'}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label={<Space><FileTextOutlined /> Ghi Chú</Space>} span={2}>
            {customer.note || customer.ghi_chu || <Text type="secondary" italic>Không có ghi chú</Text>}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Modal>
  );
};