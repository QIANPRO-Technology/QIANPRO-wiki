import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '知識管理',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        整合千鉑科技內部知識，涵蓋 Docusaurus 建站資源、
        官方文件連結與常用操作指南，讓團隊快速查找所需資訊。
      </>
    ),
  },
  {
    title: '工作流程',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        標準化 GitHub 開發流程與自家伺服器部署程序，
        包含 CI/CD 設定、Nginx 配置與版本回滾策略。
      </>
    ),
  },
  {
    title: '技術文件',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Docusaurus 建站、靜態資源管理、多語系設定與
        客製化主題，協助團隊快速建立與維護文件站點。
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
