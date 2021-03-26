import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PrismicDOM from 'prismic-dom';
import Prismic from '@prismicio/client';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import formatDate from '../../ultils/formatDate';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  const timeToRead = post.data.content.reduce((acc: number, content) => {
    const countWords = PrismicDOM.RichText.asText(content.body).split(' ')
      .length;
    acc += Math.ceil(countWords / 200);
    return acc;
  }, 0);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <Header />

      <img
        className={styles.banner}
        src={post.data.banner.url}
        alt={post.data.title}
      />
      <div className={styles.container}>
        <div className={styles.titleContainer}>
          <strong>{post.data.title}</strong>
          <div className={styles.infos}>
            <div>
              <FiCalendar size={20} color="#bbbbbb" />
              <time>{formatDate(post.first_publication_date)}</time>
            </div>
            <div>
              <FiUser size={20} color="#bbbbbb" />
              <span>{post.data.author}</span>
            </div>
            <div>
              <FiClock size={20} color="#bbbbbb" />
              <span>{timeToRead} min</span>
            </div>
          </div>
        </div>

        {post.data.content.map(content => {
          return (
            <div key={content.heading} className={styles.content}>
              <strong>{content.heading}</strong>
              {content.body.map((body, index) => {
                const pKey = index;
                return <p key={pKey}>{body.text}</p>;
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
    }
  );

  return {
    paths: posts.results.map(post => {
      return {
        params: { slug: post.uid },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          body: content.body.map(body => {
            return {
              text: body.text,
              type: body.type,
              spans:
                body.spans.length > 0
                  ? body.spans.map(span => {
                      return span.data
                        ? {
                            start: span.start,
                            end: span.end,
                            type: span.type,
                            data: span.data,
                          }
                        : {
                            start: span.start,
                            end: span.end,
                            type: span.type,
                          };
                    })
                  : [],
            };
          }),
          heading: content.heading,
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
