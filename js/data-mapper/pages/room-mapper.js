(function (global) {
  'use strict';

  var ROOM_COUNT_LABELS = {
    bedroom: '침대룸',
    bathroom: '화장실',
    livingRoom: '거실',
    ondol: '온돌룸',
    kitchen: '주방'
  };

  // roomStructures[0] + "/ " + totalRoomCount 값≥1 항목 한글 나열
  function buildRoomStructure(room) {
    if (!room) return '';
    var structures = room.roomStructures || [];
    var base = structures.length ? structures[0] : '';
    var counts = room.totalRoomCount || {};
    var labels = [];
    Object.keys(ROOM_COUNT_LABELS).forEach(function (key) {
      if (counts[key] >= 1) labels.push(ROOM_COUNT_LABELS[key]);
    });
    if (base && labels.length) return base + '/ ' + labels.join(' ');
    return base || labels.join(' ');
  }

  function notNil(v) {
    return v !== null && v !== undefined;
  }

  function RoomMapper() {
    BaseDataMapper.call(this);
  }
  RoomMapper.prototype = Object.create(BaseDataMapper.prototype);
  RoomMapper.prototype.constructor = RoomMapper;

  RoomMapper.prototype.mapPage = function () {
    this.mapRoomDetail();
    this.mapAmenities();
    this.mapRoomPreview();
    this.mapRoomNavigation();
    // mapPropertyNames() 는 호출하지 않는다 — RoomMapper 에도 BaseDataMapper 에도
    // 정의가 없어 여기서 예외가 나고, 그 뒤 updateMetaTags() 가 실행되지 않았다.
    // room.html 에는 [data-property-*] 슬롯이 하나도 없어 채울 대상도 없다.
    this.updateMetaTags();
  };

  // customFields.roomtypes (localhost / preview 경로 모두 대응)
  RoomMapper.prototype.getRoomtypes = function () {
    var cf = this.getCustomFields();
    if (cf.roomtypes && cf.roomtypes.length) return cf.roomtypes;
    if (this.data && this.data.customFields && this.data.customFields.roomtypes) {
      return this.data.customFields.roomtypes;
    }
    return cf.roomtypes || [];
  };

  // 현재 객실타입: URL ?id= (preview는 ?room_id= 호환), 없으면 첫 번째
  RoomMapper.prototype.getCurrentRoomType = function () {
    var roomtypes = this.getRoomtypes();
    var params = new URLSearchParams(window.location.search);
    var roomId = params.get('id') || params.get('room_id');
    if (roomId) {
      var found = roomtypes.filter(function (rt) { return rt.id === roomId; })[0];
      if (found) return found;
    }
    return roomtypes[0] || null;
  };

  // roomtypes[current].id === rooms[j].id 매칭
  RoomMapper.prototype.getMatchedRoom = function (roomtype) {
    if (!roomtype) return null;
    var rooms = (this.data && this.data.rooms) || [];
    return rooms.filter(function (r) { return r.id === roomtype.id; })[0] || null;
  };

  // roomtypes[i].images 중 특정 category(isSelected, sortOrder순)
  RoomMapper.prototype.getCategoryImages = function (rt, category) {
    var imgs = (rt && rt.images) || [];
    var filtered = imgs.filter(function (im) { return im.category === category; });
    return this.getSelectedImages(filtered);
  };

  // MAPPER: customFields.pages.room[현재 id].sections[0].hero.title
  RoomMapper.prototype.getRoomHeroTitle = function (rt) {
    if (!rt) return '';
    var roomPages = this.getPages().room;
    if (!Array.isArray(roomPages)) return '';
    var entry = roomPages.find(function (p) { return p.id === rt.id; });
    var hero = entry && entry.sections && entry.sections[0] && entry.sections[0].hero;
    return (hero && hero.title) ? hero.title : '';
  };

  RoomMapper.prototype.mapRoomDetail = function () {
    var rt = this.getCurrentRoomType();
    var room = this.getMatchedRoom(rt);
    if (!rt) return;

    var name = (rt && rt.name) || '';

    // 객실명 매핑 (h1)
    var titleEl = document.querySelector('#room_cont .tit h1');
    if (titleEl) {
      titleEl.textContent = name || 'Room Preview';
    }

    // 객실 구조 매핑 (p.pl) — roomStructures[0] + totalRoomCount 한글 나열
    var plEl = document.querySelector('.room_vw .pl');
    if (plEl) {
      plEl.textContent = buildRoomStructure(room);
    }

    // 히어로 슬라이드 (roomtype interior 이미지) - rebuild 방식 (정확히 N개 슬라이드)
    var wrapper = document.querySelector('.main_slide .swiper-wrapper');
    if (wrapper) {
      var slides = this.getCategoryImages(rt, 'roomtype_interior').filter(function (i) {
        return i && i.url;
      });

      // 동일 데이터로 매퍼가 두 번 실행되면 재빌드/재초기화 생략 (autoplay 타이머 리셋 방지)
      var heroSig = slides.map(function (s) { return s.url; }).join('|') || 'placeholder';
      if (wrapper.dataset.heroSig !== heroSig) {
        wrapper.dataset.heroSig = heroSig;
        wrapper.innerHTML = '';

        if (!slides.length) {
          var ph = document.createElement('div');
          ph.className = 'swiper-slide';
          ph.style.background = 'url(' + ImageHelpers.EMPTY_IMAGE_SVG + ') center center / cover no-repeat';
          wrapper.appendChild(ph);
        } else {
          slides.forEach(function (img) {
            var div = document.createElement('div');
            div.className = 'swiper-slide';
            div.style.background = 'url(' + img.url + ') center center / cover no-repeat';
            wrapper.appendChild(div);
          });
        }

        // 실제 생성된 슬라이드 수 (room.js 페이저/카운트용)
        window.roomHeroImageCount = wrapper.querySelectorAll('.swiper-slide').length;

        // 히어로 슬라이드 생성 완료 → room.js에서 Swiper 1회 초기화
        window.dispatchEvent(new Event('heroSlidesReady'));
      }
    }

    // 테이블 정보 매핑 (PC + 모바일 테이블 모두)
    document.querySelectorAll('[data-room-name]').forEach(function (el) {
      el.textContent = name;
    });

    // 평형: rooms[j].size(㎡)를 평으로 환산 (1평=3.305785㎡, 소수 1자리) — sizePyeong 미전송 대비
    document.querySelectorAll('[data-room-size]').forEach(function (el) {
      var sqm = (room && notNil(room.size)) ? Number(room.size) : null;
      el.textContent = (sqm != null && !isNaN(sqm)) ? (Math.round(sqm / 3.305785 * 10) / 10) + '평' : '';
    });

    // 유형: roomStructures[0] + totalRoomCount 한글 나열 (data-mapping.md 규칙)
    document.querySelectorAll('[data-room-type]').forEach(function (el) {
      el.textContent = buildRoomStructure(room);
    });

    document.querySelectorAll('[data-room-base-occupancy]').forEach(function (el) {
      el.textContent = (room && notNil(room.baseOccupancy)) ? room.baseOccupancy : '';
    });

    document.querySelectorAll('[data-room-max-occupancy]').forEach(function (el) {
      el.textContent = (room && notNil(room.maxOccupancy)) ? room.maxOccupancy : '';
    });

    // 추가 이미지 (.vimg ul li) - roomtype_exterior[isSelected], sortOrder 순
    var vimgLis = document.querySelectorAll('.vimg ul li');
    if (vimgLis.length) {
      var extraImages = this.getCategoryImages(rt, 'roomtype_exterior').filter(function (img) {
        return img && img.url;
      });
      vimgLis.forEach(function (li, i) {
        if (i < extraImages.length && extraImages[i].url) {
          li.style.backgroundImage = 'url(' + extraImages[i].url + ')';
          var img = li.querySelector('img');
          if (img) img.src = extraImages[i].url;
        } else {
          // 이미지 없으면 li 배경에 placeholder (img는 display:none 구조라 li 배경을 써야 보임)
          li.style.background = 'url(' + ImageHelpers.EMPTY_IMAGE_SVG + ') no-repeat center center';
          li.style.backgroundSize = 'cover';
          ImageHelpers.applyPlaceholder(li.querySelector('img'));
        }
      });
    }

    // .room_if .txt: customFields hero title 우선 → 입력 안 했으면 room.description fallback (\n→<br>)
    // 빈 값도 항상 반영 → 프리뷰에서 실시간으로 지워지고 바뀜
    var descEl = document.querySelector('.room_if .txt');
    if (descEl) {
      var heroTitle = this.getRoomHeroTitle(rt);
      var txt = (heroTitle && heroTitle.trim()) ? heroTitle : ((room && room.description) || '');
      descEl.innerHTML = txt.replace(/\n/g, '<br>');
    }

    // golink 버튼 매핑 (property.realtimeBookingId 사용)
    var golink = document.querySelector('.r_cont .golink a');
    if (golink) {
      var bookingUrl = this.getBookingUrl();
      if (bookingUrl && bookingUrl !== '#!') {
        golink.href = bookingUrl;
        golink.addEventListener('click', function (e) {
          e.preventDefault();
          window.open(bookingUrl, '_blank');
        });
      }
    }

    // [data-booking-link] (헤더/푸터)는 header-footer-mapper가 headerFooterLoaded 시점에 처리 —
    // 여기(DOMContentLoaded)선 아직 DOM에 주입 전이라 중복 처리하지 않음
  };

  // MAPPER: 현재 roomtype interior[isSelected] → rv_slider 슬라이드 생성 (sortOrder 순 0~2번째 3장)
  RoomMapper.prototype.mapRoomPreview = function () {
    var wrapper = document.querySelector('.rv_slider .swiper-wrapper');
    if (!wrapper) return;

    var rt = this.getCurrentRoomType();
    var name = (rt && rt.name) || '';

    var images = this.getCategoryImages(rt, 'roomtype_interior').filter(function (img) {
      return img && img.url;
    }).slice(0, 3);

    wrapper.innerHTML = '';

    if (!images.length) {
      // 이미지 없으면 placeholder 슬라이드 표시
      for (var i = 0; i < 3; i++) {
        var ph = document.createElement('li');
        ph.className = 'swiper-slide';
        ph.style.backgroundImage = 'url(' + ImageHelpers.EMPTY_IMAGE_SVG + ')';
        ph.style.backgroundRepeat = 'no-repeat';
        ph.style.backgroundPosition = 'center center';
        ph.style.backgroundSize = 'cover';
        wrapper.appendChild(ph);
      }
    } else {
      images.forEach(function (img) {
        var li = document.createElement('li');
        li.className = 'swiper-slide';
        li.setAttribute('data-title', name);
        li.style.backgroundImage = 'url(' + img.url + ')';
        li.style.backgroundRepeat = 'no-repeat';
        li.style.backgroundPosition = 'center center';
        li.style.backgroundSize = 'cover';
        wrapper.appendChild(li);
      });
    }

    // 슬라이드 DOM 생성 완료 → room.js에서 Swiper 1회 초기화
    window.dispatchEvent(new Event('roomSliderReady'));
  };

  // MAPPER: 매칭 rooms[current].amenities → 객실 시설 (inline, 쉼표 구분) - PC/모바일 모두
  RoomMapper.prototype.mapAmenities = function () {
    var rt = this.getCurrentRoomType();
    var room = this.getMatchedRoom(rt);
    var amenitiesText = (room && room.amenities && room.amenities.length) ? room.amenities.join(', ') : '';

    document.querySelectorAll('[data-room-amenities]').forEach(function (container) {
      container.textContent = amenitiesText;
    });
  };

  // MAPPER: roomtypes[] → snb_wrap 네비게이션 (현재 roomtype = on, 이름 없는 것 skip)
  RoomMapper.prototype.mapRoomNavigation = function () {
    var roomtypes = this.getRoomtypes();
    var currentRt = this.getCurrentRoomType();

    var ul = document.querySelector('[data-room-nav-list]');
    if (!ul) return;

    ul.innerHTML = '';

    var pages = this.getPages();
    var layoutEnabled = pages.layoutMap && pages.layoutMap.sections &&
      pages.layoutMap.sections[0] && pages.layoutMap.sections[0].enabled !== false;
    if (layoutEnabled) {
      var pli = document.createElement('li');
      var pa = document.createElement('a');
      pa.href = 'layout-map.html';
      pa.textContent = '미리보기';
      pli.appendChild(pa);
      ul.appendChild(pli);
    }

    var self = this;
    var currentId = currentRt && currentRt.id;
    var activeRoomtypes = roomtypes.filter(function (rt) {
      if (!(rt && rt.name && rt.name.trim())) return false;
      var matched = self.getMatchedRoom(rt);
      return !(matched && matched.status === 'inactive');
    });
    var roomItems = this.getRoomMenuItems(activeRoomtypes, function (rt) { return (rt && rt.name) || ''; });
    // 그룹 안이면 그 그룹의 객실만 펼친다.
    // 헤더/미리보기 메뉴는 그룹명 하나로 접히고 클릭 시 그룹의 첫 객실로 들어가는데,
    // 이 탭까지 접혀 있으면 2번째 객실부터는 UI 로 도달할 방법이 없다.
    // 멤버가 1실인 그룹은 펼치지 않는다(항목이 하나뿐이라 의미가 없다).
    var activeGroup = null;
    roomItems.forEach(function (it) {
      var members = (it && it.roomtypes) || [];
      if (members.length > 1 && self.isRoomMenuItemActive(it, currentId)) activeGroup = it;
    });
    if (activeGroup) {
      roomItems = activeGroup.roomtypes.map(function (rt) {
        return { label: (rt && rt.name) || '', roomtype: rt, roomtypes: [rt] };
      });
    }
    roomItems.forEach(function (item) {
      var roomLabel = self.getRoomMenuLabel(item);
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = self.getRoomMenuLink(item, 'id');
      link.textContent = roomLabel;
      if (self.isRoomMenuItemActive(item, currentId)) li.className = 'on';
      li.appendChild(link);
      ul.appendChild(li);
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    // previewHandler가 데이터를 받았으면 스킵 (preview-handler가 처리함)
    if (window.previewHandler && window.previewHandler.currentData) return;

    var mapper = new RoomMapper();
    mapper.initialize();
    global.roomMapperInstance = mapper;

    // mapPage() 완료 후 이벤트 발생 (room.js에서 Swiper 재초기화용)
    window.dispatchEvent(new Event('roomMapperReady'));
  });

  global.RoomMapper = RoomMapper;
})(window);
