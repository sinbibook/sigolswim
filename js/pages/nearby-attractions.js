// 히어로는 단일 정적 이미지 (슬라이더 없음, directions.html 방식) — 매퍼가 #main_banner에 이미지 1장만 렌더

// enabled 상태 확인 (preview-handler 데이터 업데이트 시)
// preview-handler가 없으면 localhost이므로 체크 안 함
function checkNearbyAttractionsEnabled() {
  if (!window.previewHandler) return;

  if (window.previewHandler.currentData) {
    const nearbyEnabled = window.previewHandler.currentData?.homepage?.customFields?.pages?.nearbyAttractions?.sections?.[0]?.enabled;
    if (nearbyEnabled === false) {
      window.location.href = '404.html';
      return;
    }
  }
}
window._checkPageEnabled = checkNearbyAttractionsEnabled;
