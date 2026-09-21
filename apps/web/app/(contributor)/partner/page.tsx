import Link from "next/link";
import { ContributorApplicationForm } from "../../../components/contributor/application-form";

export default function ContributorApplicationPage() {
  return <main className="partner-application"><section className="partner-application-intro"><p className="eyebrow light">Princess & Brothers · Contributor community</p><h1>Bring your good<br /><em>things here.</em></h1><p>We partner with independent makers, small studios and thoughtful brands to make the everyday more interesting.</p><div className="partner-values"><span><b>01</b> Thoughtful partners</span><span><b>02</b> A considered audience</span><span><b>03</b> Room to grow</span></div></section><section className="partner-form-panel"><ContributorApplicationForm /></section></main>;
}