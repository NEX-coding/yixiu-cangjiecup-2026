import { LegalPageLayout } from "@/components/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="隐私政策">
      <section>
        <h2>1. 我们收集的信息</h2>
        <p>
          为提供账户登录、任务处理与作品管理，我们可能收集您的邮箱、昵称、上传图片、生成记录及必要的设备与日志信息。
        </p>
      </section>
      <section>
        <h2>2. 信息的使用</h2>
        <p>
          上述信息用于身份验证、内容生成、任务进度展示、服务优化与安全防护。未经您同意，我们不会将个人信息用于本政策未载明的其他目的。
        </p>
      </section>
      <section>
        <h2>3. 信息的存储与保护</h2>
        <p>
          数据存储于受控的服务环境中，我们采取合理的技术与管理措施防止未经授权的访问、泄露或篡改。您应妥善保管账户密码。
        </p>
      </section>
      <section>
        <h2>4. 第三方服务</h2>
        <p>
          为实现 AI 生成、视频制作等功能，您的部分数据可能经由加密传输提供给合作的模型或工具服务（如图像生成 API、豆包等）。我们会尽量选择合规的服务提供方。
        </p>
      </section>
      <section>
        <h2>5. 您的权利</h2>
        <p>
          您可在个人中心查看或更新账户信息，并可联系我们申请删除账户及相关数据（法律法规另有规定的除外）。
        </p>
      </section>
      <section>
        <h2>6. 政策更新</h2>
        <p>
          我们可能更新本隐私政策，更新后将通过本平台提示。请您定期查阅以了解最新内容。
        </p>
      </section>
    </LegalPageLayout>
  );
}
