# 穷人日记

黑白极简的 iOS/PWA 记账原型。图标是黑底白色魏碑感「帳」字，适合在 iPhone Safari 中添加到主屏幕使用。

## 功能

- 手动录入金额、支付手段、消费类型、商家、标签和备注
- 分类按纽约生活重新整理：HOA、房屋贷款、车险、油费、Toll Fee、订阅服务、投资理财等
- 月历表、当日交易记录、最近交易记录
- 消费和收入柱状图、消费类型饼图、12 个月趋势曲线
- AI 深度分析：可配置 OpenAI API Key，也可一键复制提示词到 ChatGPT
- 导出 Excel 兼容 `.xls`、CSV、本地 JSON 备份和恢复

## 当前支出分类

- HOA
- 房屋贷款
- 水电网气
- 地铁公交
- 买菜超市
- 外食
- 手机账单
- 车险
- 油费
- Toll Fee
- 停车费
- 车辆保养
- 医疗
- 购物
- 订阅服务
- 投资理财
- 家庭日用
- 其他

## 当前收入分类

- 工资
- 奖金
- 报销/退款
- 现金收入
- 投资收益
- 二手转卖
- 礼金
- 其他

## 支付方式

- Credit Card
- Debit Card
- Apple Pay
- Cash
- Zelle
- ACH / Bank Transfer
- Check
- EBT / SNAP
- Other

## 本地运行

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

## 数据

数据默认存在浏览器本地 `localStorage`。换手机前建议导出 JSON 备份或 Excel/CSV 文件到 iCloud Drive。
