import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Plus from '../../../public/images/plus.svg';

type Duration = 'oneday' | 'short' | 'long';

type GroupItem = {
  id: number;
  status: '모집중' | '모집예정' | '서비스종료';
  statusColor: 'red' | 'blue' | 'black';
  category: string;
  region: string;
  title: string;
  desc: string;
  dday: string;
  ad?: boolean;
  thumbnail: string;
  duration: Duration; // ⬅️ 추가: 원데이/단기/장기
};

const STATUS_BG = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  black: 'bg-black',
} as const;

function StatusBadge({
  text,
  color,
}: {
  text: GroupItem['status'];
  color: GroupItem['statusColor'];
}) {
  return (
    <span
      className={[
        'text-sm font-bold text-white px-2 py-1',
        'rounded-tl-[15px] rounded-tr-[15px] rounded-br-[15px]',
        'relative z-[1] inline-block translate-x-[20%] translate-y-[20%]',
        STATUS_BG[color],
      ].join(' ')}
    >
      {text}
    </span>
  );
}

function GroupCard({ item }: { item: GroupItem }) {
  return (
    <li className="w-[240px] h-[330px] bg-white rounded-[5px] overflow-hidden relative cursor-pointer">
      <article>
        <StatusBadge text={item.status} color={item.statusColor} />
        <div className="relative h-[150px] overflow-hidden">
          <img
            src={item.thumbnail}
            alt={`${item.title} 썸네일`}
            className="w-full h-full object-cover rounded-t-[10px]"
          />
          <button type="button" aria-label="즐겨찾기" className="absolute top-2 right-2 size-6">
            <img src="/images/unfill_star.png" alt="" aria-hidden="true" />
          </button>
        </div>

        <div className="p-3 border border-[#eee]">
          <header className="flex justify-between text-sm mb-2">
            <span className="text-red-500">{item.category}</span>
            <span className="text-gray-400">{item.region}</span>
          </header>
          <h3 className="text-lg font-bold hover:underline">{item.title}</h3>
          <p className="text-sm text-[#979797] h-10 overflow-hidden mb-1">{item.desc}</p>
          <footer className="flex justify-between text-sm">
            <time className="bg-gray-400/70 text-white rounded-2xl px-2 py-1">{item.dday}</time>
            {item.ad && <span className="bg-gray-200 rounded-2xl px-2 py-1">AD</span>}
          </footer>
        </div>
      </article>
    </li>
  );
}

const FILTERS: { key: Duration; label: string }[] = [
  { key: 'oneday', label: '원데이 모임' },
  { key: 'short', label: '단기 모임' },
  { key: 'long', label: '장기 모임' },
];

export default function AiGroupsSection() {
  const [active, setActive] = useState<Duration>('oneday');

  const data: GroupItem[] = [
    // ===== 원데이 (4) =====
    {
      id: 1,
      status: '모집중',
      statusColor: 'red',
      category: '요리/베이킹',
      region: '서울',
      title: '핸드드립 커피 원데이 클래스',
      desc: '싱글 오리진으로 핸드드립 처음부터 같이 배워요 ☕️',
      dday: 'D-2',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'oneday',
    },
    {
      id: 2,
      status: '모집예정',
      statusColor: 'blue',
      category: '사진/영상',
      region: '부산',
      title: '해운대 노을 출사 원데이',
      desc: '구도/노출 기본 잡고 인생사진 남기자 📸',
      dday: 'D-5',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'oneday',
    },
    {
      id: 3,
      status: '모집중',
      statusColor: 'red',
      category: '공예/DIY',
      region: '인천',
      title: '도자기 머그컵 만들기',
      desc: '나만의 컵을 빚어보는 하루 체험 🏺',
      dday: 'D-1',
      ad: true,
      thumbnail: '/images/group_img.png',
      duration: 'oneday',
    },
    {
      id: 4,
      status: '모집중',
      statusColor: 'red',
      category: '취미/여가',
      region: '온라인',
      title: '보드게임 번개 모임(원데이)',
      desc: '룰 설명부터 바로 실전! 라운드 돌려봐요 🎲',
      dday: 'D-3',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'oneday',
    },

    // ===== 단기 (4) =====
    {
      id: 5,
      status: '모집중',
      statusColor: 'red',
      category: '운동/건강',
      region: '서울',
      title: '4주 러닝 기초반',
      desc: '호흡/폼 교정으로 5km 완주 도전 🏃‍♀️',
      dday: 'D-6',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'short',
    },
    {
      id: 6,
      status: '모집예정',
      statusColor: 'blue',
      category: '스터디/자기개발',
      region: '온라인',
      title: '타입스크립트 스터디(2주 과정)',
      desc: '기본 타입부터 제네릭까지 핵심만 쫙 💻',
      dday: 'D-9',
      ad: true,
      thumbnail: '/images/group_img.png',
      duration: 'short',
    },
    {
      id: 7,
      status: '모집중',
      statusColor: 'red',
      category: '운동/건강',
      region: '대전',
      title: '3주 아침 요가 루틴',
      desc: '굿모닝 스트레칭으로 하루 시작 🧘',
      dday: 'D-4',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'short',
    },
    {
      id: 8,
      status: '모집중',
      statusColor: 'red',
      category: '요리/베이킹',
      region: '대구',
      title: '4주 홈베이킹 클래스',
      desc: '스콘→쿠키→타르트→파운드까지 🍰',
      dday: 'D-8',
      ad: true,
      thumbnail: '/images/group_img.png',
      duration: 'short',
    },

    // ===== 장기 (4) =====
    {
      id: 9,
      status: '모집중',
      statusColor: 'red',
      category: '스포츠',
      region: '부산',
      title: '3개월 자전거 라이딩 크루',
      desc: '주 2회 코스 탐방 & 기록 공유 🚴',
      dday: 'D-10',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'long',
    },
    {
      id: 10,
      status: '모집예정',
      statusColor: 'blue',
      category: '스터디/자기개발',
      region: '온라인',
      title: '12주 영어 회화 챌린지',
      desc: '롤플레이 & 발음 교정으로 자신감 업 🇬🇧',
      dday: 'D-12',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'long',
    },
    {
      id: 11,
      status: '모집중',
      statusColor: 'red',
      category: '봉사/사회참여',
      region: '광주',
      title: '10주 반려동물 보호소 봉사',
      desc: '산책/청소/기록 프로젝트로 꾸준 봉사 🐶',
      dday: 'D-14',
      ad: true,
      thumbnail: '/images/group_img.png',
      duration: 'long',
    },
    {
      id: 12,
      status: '모집중',
      statusColor: 'red',
      category: '운동/건강',
      region: '제주',
      title: '12주 클라이밍 중급반',
      desc: '볼더링 테크닉 & 코어 강화 프로그램 🧗‍♂️',
      dday: 'D-11',
      ad: false,
      thumbnail: '/images/group_img.png',
      duration: 'long',
    },
  ];

  const filtered = useMemo(() => data.filter(d => d.duration === active), [active, data]);

  return (
    <section className="mx-auto max-w-[1024px] " aria-labelledby="popular-groups-heading">
      <header className="pt-[80px] pb-[36px]">
        {/* 제목 단독 줄 */}
        <h2 id="popular-groups-heading" className="font-semibold text-lg mb-2">
          Mo:ri 가 엄선한 인기모임!
        </h2>

        {/* 설명 + 더보기 + 필터버튼 한 줄 */}
        <div className="flex items-center justify-between">
          {/* 왼쪽: 설명 + 더보기 */}
          <div className="flex items-center gap-4">
            <p className="font-semibold text-xxl">지금 바로 확인하세요!</p>
            <Link to="/" className="flex items-center text-sm gap-1 pb-1">
              <img src={Plus} alt="" aria-hidden="true" />
              더보기
            </Link>
          </div>

          {/* 오른쪽: 필터버튼 */}
          <div className="flex gap-2" role="tablist" aria-label="모임 기간 필터">
            {FILTERS.map(f => {
              const isActive = active === f.key;
              return (
                <button
                  key={f.key}
                  aria-selected={isActive}
                  aria-pressed={isActive}
                  onClick={() => setActive(f.key)}
                  className={[
                    'px-3 py-1 rounded-full text-sm border',
                    isActive
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-blue-600 border-blue-400 hover:bg-blue-50',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <ul className="flex gap-5 flex-wrap pb-10">
        {filtered.length ? (
          filtered.map(item => <GroupCard key={item.id} item={item} />)
        ) : (
          <li className="text-sm text-gray-500 py-8">조건에 맞는 모임이 없어요.</li>
        )}
      </ul>
    </section>
  );
}
