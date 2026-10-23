import { LegalPageLayout } from "@/components/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout title="用户协议">
      <section>
        <h2>1. 服务说明</h2>
        <p>
          衣秀（以下简称「本平台」）向用户提供 AI 辅助的服装模特图与带货短视频生成服务。使用本平台即表示您已阅读、理解并同意本协议。
        </p>
      </section>
      <section>
        <h2>2. 账户与使用规范</h2>
        <p>
          您应使用真实、合法的邮箱注册账户，并妥善保管登录凭证。不得利用本平台从事违法违规、侵犯他人权益或干扰服务正常运行的行为。
        </p>
      </section>
      <section>
        <h2>3. 内容与知识产权</h2>
        <p>
          您上传的素材应拥有合法使用权。通过本平台生成的内容，其权利归属按适用法律及您与第三方服务（如模型提供方）的约定执行；您应自行确认生成内容的商用与发布合规性。
        </p>
      </section>
      <section>
        <h2>4. 服务变更与中断</h2>
        <p>
          我们可能因维护、升级或不可抗力暂停或调整服务，并将尽力提前通知。对于免费或测试功能，我们不保证服务的持续可用性。
        </p>
      </section>
      <section>
        <h2>5. 免责声明</h2>
        <p>
          AI 生成结果可能存在偏差或不准确，本平台不对生成内容的准确性、完整性作明示或默示保证。因使用生成内容而产生的纠纷或损失，由您自行承担相应责任。
        </p>
      </section>
      <section>
        <h2>6. 协议更新</h2>
        <p>
          我们可能适时修订本协议，修订后将通过本平台公布。若您继续使用服务，即视为接受更新后的协议。
        </p>
      </section>
    </LegalPageLayout>
  );
}
