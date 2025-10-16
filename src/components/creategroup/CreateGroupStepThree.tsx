import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcDday } from '../../utils/date';
import Modal from '../common/modal/Modal';
import MeetingHeader from '../common/prevgroup/MeetingHeader';
import CreateGroupNavigation from './CreateGroupNavigation';
import MeetingTabs from '../common/prevgroup/MeetingTabs';
import { useGroup } from '../../contexts/GroupContext';
import type { StepTwoProps } from '../../types/group';

type StepThreeProps = Omit<StepTwoProps, 'onChange'>;

function CreateGroupStepThree({ formData, onPrev, onNext }: StepThreeProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { createGroup } = useGroup();

  // 모임 등록 함수
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Supabase에 저장할 데이터 매핑
      await createGroup({
        group_title: formData.title,
        group_region: formData.region,
        group_short_intro: formData.summary,
        group_content: formData.description,
        group_start_day: formData.startDate,
        group_end_day: formData.endDate,
        group_kind:
          formData.interestMajor === '운동/건강'
            ? 'sports'
            : formData.interestMajor === '스터디/학습'
              ? 'study'
              : formData.interestMajor === '취미/여가'
                ? 'hobby'
                : formData.interestMajor === '봉사/사회참여'
                  ? 'volunteer'
                  : 'etc',
        group_capacity: formData.memberCount,
        group_region_any: formData.regionFree,
        status: 'recruiting', // 관리자 승인 기능 전까지는 즉시 모집중 상태로 (관리자 승인 로직은 나중에 status: 'pending'만 바꾸면 됨!!)
      });

      setOpen(true); // 성공 시 모달 오픈
    } catch (error) {
      console.error('모임 등록 실패:', error);
      alert('모임 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // D-Day 계산
  const dday = calcDday(formData.startDate);

  return (
    <div className="flex flex-col p-8 bg-white rounded shadow space-y-6">
      <h2 className="text-2xl font-bold">미리보기 / 확정</h2>
      <hr className="mb-6 pb-3 border-brand" />

      <div className="space-y-8">
        {/* 상단 MeetingHeader */}
        <MeetingHeader
          title={formData.title}
          status="모집중"
          category={formData.interestMajor}
          subCategory={formData.interestSub}
          summary={formData.summary}
          dday={dday}
          duration={`${formData.startDate} ~ ${formData.endDate}`}
          participants={`0/${formData.memberCount}`}
          images={formData.images.map(file => URL.createObjectURL(file))}
          isFavorite={false}
          mode="preview"
          onFavoriteToggle={() => {}}
          onApply={() => {}}
        />

        {/* 모임 소개 - 이 안에 모임장, 커리큘럼 다모아놈 */}
        <MeetingTabs
          intro={formData.description}
          curriculum={formData.curriculum.map((c, i) => ({
            title: c.title,
            detail: c.detail,
            files: formData.files?.[i]?.map(f => URL.createObjectURL(f)) ?? [],
          }))}
          leader={{
            name: formData.leaderName,
            location: formData.leaderLocation,
            career: formData.leaderCareer,
          }}
        />
      </div>

      {/* 생성 신청 버튼 */}
      <div className="flex justify-end">
        <CreateGroupNavigation
          step={3}
          totalSteps={3}
          onPrev={onPrev!}
          onNext={onNext!}
          onSubmit={handleSubmit}
          disableNext={submitting}
        />
      </div>

      {/* 완료 모달 */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="🎉 모임이 등록되었습니다!"
        message="이제 모임이 리스트에 바로 표시됩니다."
        actions={[
          {
            label: '모임 리스트로 이동',
            onClick: () => navigate('/grouplist'),
            variant: 'primary',
          },
        ]}
      />
    </div>
  );
}

export default CreateGroupStepThree;
