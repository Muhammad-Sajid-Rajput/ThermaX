const toggleStyles = `
  .theme-switch {
    font-size: 17px;
    position: relative;
    display: inline-block;
    width: 3.5em;
    height: 2em;
    cursor: pointer;
  }

  .theme-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .theme-switch__slider {
    --background: #20262c;
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: var(--background);
    transition: 0.5s;
    border-radius: 30px;
  }

  .theme-switch__slider::before {
    position: absolute;
    content: "";
    height: 1.4em;
    width: 1.4em;
    border-radius: 50%;
    left: 10%;
    bottom: 15%;
    box-shadow: inset 8px -4px 0 0 #ececd9, -4px 1px 4px 0 #dadada;
    background: var(--background);
    transition: 0.5s;
  }

  .theme-switch__decoration {
    position: absolute;
    content: "";
    height: 2px;
    width: 2px;
    border-radius: 50%;
    right: 20%;
    top: 15%;
    background: #e5f041e6;
    backdrop-filter: blur(10px);
    transition: all 0.5s;
    box-shadow:
      -7px 10px 0 #e5f041e6,
      8px 15px 0 #e5f041e6,
      -17px 1px 0 #e5f041e6,
      -20px 10px 0 #e5f041e6,
      -7px 23px 0 #e5f041e6,
      -15px 25px 0 #e5f041e6;
  }

  .theme-switch input:checked ~ .theme-switch__decoration {
    transform: translateX(-20px);
    width: 10px;
    height: 10px;
    background: #fff;
    box-shadow:
      -12px 0 0 #fff,
      -6px 0 0 1.6px #fff,
      5px 15px 0 1px #fff,
      1px 17px 0 #fff,
      10px 17px 0 #fff;
  }

  .theme-switch input:checked + .theme-switch__slider {
    background-color: #5494de;
  }

  .theme-switch input:checked + .theme-switch__slider::before {
    transform: translateX(100%);
    box-shadow: inset 15px -4px 0 15px #efdf2b, 0 0 10px 0 #efdf2b;
  }
`;

export default toggleStyles;
