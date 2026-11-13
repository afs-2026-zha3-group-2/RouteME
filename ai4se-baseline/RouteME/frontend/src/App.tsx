import { Layout, Typography } from 'antd';
import { HomePage } from './home/HomePage';
import { messages } from './i18n/messages';

const { Content, Header } = Layout;

export function App() {
  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Typography.Text strong>{messages.appName}</Typography.Text>
      </Header>
      <Content>
        <HomePage />
      </Content>
    </Layout>
  );
}
