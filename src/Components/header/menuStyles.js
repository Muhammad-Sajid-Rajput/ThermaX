const menuStyles = `
  .mobile-menu {
    position: relative;
  }

  .mobile-menu > .event-wrapper-inp {
    display: none;
  }

  .mobile-menu .event-wrapper {
    background-color: var(--color-primary);
    border: 1px solid color-mix(in srgb, var(--color-primary) 70%, var(--color-background-dark) 30%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.5rem;
    width: 2.8rem;
    cursor: pointer;
    transition: filter 0.2s;
  }

  .mobile-menu .event-wrapper:hover {
    filter: brightness(0.96);
  }

  .mobile-menu .menu-container {
    background-color: var(--color-background-light);
    color: var(--color-text-dark);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, var(--color-background-light) 60%);
    border-radius: 10px;
    position: absolute;
    width: 170px;
    right: 0;
    top: 130%;
    overflow: hidden;
    clip-path: inset(10% 50% 90% 50% round 10px);
    transition: all 0.4s;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    z-index: 60;
  }

  .dark .mobile-menu .menu-container {
    background-color: color-mix(in srgb, var(--color-background-dark) 92%, var(--color-text-dark) 8%);
    color: var(--color-background-light);
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-background-dark) 60%);
  }

  .mobile-menu .menu-list {
    --delay: 0.4s;
    --trdelay: 0.12s;
    display: block;
    width: 100%;
    text-align: left;
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.2;
    padding: 10px 12px;
    border-radius: inherit;
    transition: background-color 0.2s 0s;
    position: relative;
    transform: translateY(30px);
    opacity: 0;
  }

  .mobile-menu .menu-list::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    height: 1px;
    background-color: color-mix(in srgb, var(--color-soft-green) 30%, transparent 70%);
    width: 92%;
  }

  .mobile-menu .menu-list:last-child::after {
    display: none;
  }

  .mobile-menu .menu-list:hover {
    background-color: color-mix(in srgb, var(--color-primary) 14%, transparent 86%);
  }

  .mobile-menu .menu-list--active {
    color: var(--color-primary);
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .menu-container {
    clip-path: inset(0% 0% 0% 0% round 10px);
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .menu-container .menu-list {
    transform: translateY(0);
    opacity: 1;
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .menu-container .menu-list:nth-child(1) {
    transition:
      transform 0.4s var(--delay),
      opacity 0.4s var(--delay);
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .menu-container .menu-list:nth-child(2) {
    transition:
      transform 0.4s calc(var(--delay) + (var(--trdelay) * 1)),
      opacity 0.4s calc(var(--delay) + (var(--trdelay) * 1));
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .menu-container .menu-list:nth-child(3) {
    transition:
      transform 0.4s calc(var(--delay) + (var(--trdelay) * 2)),
      opacity 0.4s calc(var(--delay) + (var(--trdelay) * 2));
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .menu-container .menu-list:nth-child(4) {
    transition:
      transform 0.4s calc(var(--delay) + (var(--trdelay) * 3)),
      opacity 0.4s calc(var(--delay) + (var(--trdelay) * 3));
  }

  .mobile-menu .bar {
    display: flex;
    height: 50%;
    width: 20px;
    flex-direction: column;
    gap: 3px;
  }

  .mobile-menu .bar-list {
    --transform: -25%;
    display: block;
    width: 100%;
    height: 3px;
    border-radius: 50px;
    background-color: var(--color-text-dark);
    transition: all 0.4s;
    position: relative;
  }

  .dark .mobile-menu .bar-list {
    background-color: var(--color-background-dark);
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .event-wrapper .top {
    transform-origin: top right;
    transform: translateY(var(--transform)) rotate(-45deg);
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .event-wrapper .middle {
    transform: translateX(-50%);
    opacity: 0;
  }

  .mobile-menu .event-wrapper-inp:not(:checked) ~ .event-wrapper .bottom {
    transform-origin: bottom right;
    transform: translateY(calc(var(--transform) * -1)) rotate(45deg);
  }
`;

export default menuStyles;
