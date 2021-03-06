# Ease
Ease 프로젝트는 브라우저 애니메이션을 만들 때, 애니메이션 대상에 easing 효과를 부여하기 위한 기능을 제공하는 자바스크립트 모듈을 만들기 위한 프로젝트이다.

[DV](https://github.com/karkata/DV) 프로젝트(SVG를 다루는) 진행하는 과정에서 SVG를 이용하여 애니메이션을 만들 때, spline을 이용한 보간이 가능함을 알았다. 원래 DV 모듈 내에서 spline을 이용하여 요소 스스로가 easing 효과를 가지고 애니메이션을 처리할 수 있는 기능을 추가하려고 했으나, 애니메이션 요소(animate, animateMotion, ...)를 이용한 애니메이션 처리 기법은 deprecated 상태로 전환될 가능성이 높은 까닭에, easing 애니메이션을 지원하기 위한 함수를 따로 구현해야 했고, 이 기능을 DV 모듈 뿐만 아니라 범용적으로 사용되기를 바래서 Ease 모듈로 분리되었다.

Easing 함수는 이미 많은 구현법들이 인터넷에 공개되어 있고, jQuery의 animate 함수에 easing 파라미터를 사용하여 애니메이션 효과를 사용할 수 있음은 이미 누구나 아는 사실이다.

Easing과 관련된 기능을 제공하는 라이브러리들은 이미 많은 수가 인터넷에 공개되어 있지만,  Ease 프로젝트는 개인적으로 easing 함수를 구현하는 방법에 대해 알고리즘 수준에서 접근을 하기 위해서 개인적 욕심에서 시작된 프로젝트이다. (잘 알려진 타 라이브러리에 비해 문제점이 많을지도 모르겠다.)
> **Note:**
> - Elastic easing, Back easing, Bounce easing은 수치 및 사용하는 함수에 따라 완곡함이 달라지기 때문에, 공개된 알고리즘 중에서 부분만 차용하였다.
> - Exponential easing은 MS의 WPF에서 사용되는 알고리즘을 사용했다. 
> - 그 외의 easing 함수들은 2차, 3차, 4차, 5차, sin, 루트(원) 그래프를 이용하여 직접 구현했다.
> - 이 모듈은 css를 이용하지 않고 순수 자바스크립트만을 가지고 애니메이션을 구현할 때 사용한다.

## 설치 방법
특별한 설치 방법은 없으며, 현재 프로젝트의 js 디렉터리에 있는 js 파일을 복사해서 사용하는 것이 전부이다.

## 개발 환경 설정
### Node.js
노드를 잘 몰라서 어떻게 사용해야 하는지 모른다.
### Browser
ease.js 파일을 연결하는 것이 전부이다.
<pre>
&lt;script src="{path}/ease.js"&gt;&lt;/script&gt;
</pre>

## 사용 방법
프로젝트는 HTML 파일과 JS 파일로 구성되어 있는데, 루트 디렉터리에 있는 index.html을 브라우저로 열면, 각각의 easing 효과를 사용하기 위한 예제가 링크되어 있을 것이다.
> DV 모듈을 사용한 SVG 애니메이션을 예제로 사용하고 있기 때문에, 다른 환경에서 테스트를 해보는데 불친절 할 수 있다.

## 업데이트 내역
### 1.0.0 (2018-04-24)
- 최초 생성

## 라이선스
Apache 2.0

## Credit
- [Improved Easing Functions](https://joshondesign.com/2013/03/01/improvedEasingEquations)
- [ExponentialEase Class (System.Windows.Media.Animation)](https://docs.microsoft.com/ko-kr/dotnet/api/system.windows.media.animation.exponentialease?view=netframework-4.7.1)
- [Commented by ChristianFigueroa](https://gist.github.com/gre/1650294)

## 기타
karkata@gmail.com
